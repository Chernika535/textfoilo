'use client';
import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react';
import { type Portfolio, validatePortfolio } from './model';
export type Publication = { slug: string; active: number; publishedAt: string };
export function usePortfolio() {
  const [portfolio,setPortfolio] = useState<Portfolio|null>(null);
  const [loadingError,setLoadingError] = useState('');
  const [saveError,setSaveError] = useState('');
  const [status,setStatus] = useState<'saved'|'saving'|'offline'|'conflict'>('saved');
  const [guest,setGuest]=useState(false);
  const [publication,setPublication] = useState<Publication|null>(null);
  const [reloadTick,reload] = useState(0);
  const current = useRef<Portfolio|null>(null); const revision=useRef(0); const account=useRef('');
  const saved = useRef(''); const inFlight = useRef(false); const conflicted=useRef(false); const dirty=useRef(false);
  const setP=useCallback((action:SetStateAction<Portfolio|null>)=>{
    setPortfolio(old=>{const next=typeof action==='function'?action(old):action; current.current=next; dirty.current=true; return next;});
  },[]);
  const sync=useCallback(async()=>{
    const p=current.current;
    if(!p||inFlight.current||conflicted.current)return;
    const document=JSON.stringify(p);
    if(document===saved.current){dirty.current=false;return;}
    inFlight.current=true;setStatus('saving');
    try{
      const response=await fetch('/api/portfolio',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({portfolio:p,revision:revision.current})});
      const data=await response.json() as {error?:string;revision:number;updatedAt:string;portfolio:unknown;account:string;publication:Publication|null;guest:boolean};
      if(!response.ok){if(response.status===409){conflicted.current=true;setStatus('conflict');}throw new Error(data.error||'Не удалось сохранить изменения.');}
      revision.current=data.revision;saved.current=document;setSaveError('');setStatus('saved');dirty.current=JSON.stringify(current.current)!==document;
      try {localStorage.setItem(`textfolio:pending:${account.current}`,JSON.stringify({document:current.current,revision:revision.current,dirty:dirty.current}));}catch{}
    }catch(e){setSaveError(e instanceof Error?e.message:'Нет связи с сервером.');if(!conflicted.current)setStatus('offline');}
    finally{inFlight.current=false;}
  },[]);
  useEffect(()=>{
    let active=true;setLoadingError('');
    (async()=>{try{
      const response=await fetch('/api/portfolio',{cache:'no-store'});const data=await response.json() as {error?:string;revision:number;updatedAt:string;portfolio:unknown;account:string;publication:Publication|null;guest:boolean};
      if(!response.ok)throw new Error(data.error||'Не удалось загрузить портфолио.');
      let p=validatePortfolio(data.portfolio);const serverDocument=JSON.stringify(p);if(!active)return;
      try {const raw=localStorage.getItem(`textfolio:pending:${data.account}`);if(raw){const recovery=JSON.parse(raw);if(recovery.dirty&&recovery.revision===data.revision)p=validatePortfolio(recovery.document);}}catch{}
      revision.current=data.revision;account.current=data.account;saved.current=serverDocument;current.current=p;conflicted.current=false;dirty.current=JSON.stringify(p)!==serverDocument;
      setPortfolio(p);setGuest(data.guest);setPublication(data.publication);setSaveError('');setStatus('saved');
    }catch(e){if(active)setLoadingError(e instanceof Error?e.message:'Не удалось соединиться с сервером.');}})();
    return()=>{active=false;};
  },[reloadTick]);
  useEffect(()=>{if(!portfolio)return;try{localStorage.setItem(`textfolio:pending:${account.current}`,JSON.stringify({document:portfolio,revision:revision.current,dirty:JSON.stringify(portfolio)!==saved.current}));}catch{}const t=setTimeout(sync,650);return()=>clearTimeout(t);},[portfolio,sync]);
  useEffect(()=>{
    const t=setInterval(()=>{if(dirty.current)void sync();},3000);
    const online=()=>{void sync();};
    const beforeUnload=(e:BeforeUnloadEvent)=>{if(dirty.current){e.preventDefault();e.returnValue='';}};
    window.addEventListener('online',online);window.addEventListener('beforeunload',beforeUnload);
    return()=>{clearInterval(t);window.removeEventListener('online',online);window.removeEventListener('beforeunload',beforeUnload);};
  },[sync]);
  return {p:portfolio,setP,guest,saveError,status,publication,setPublication,loadingError,retry:()=>reload(n=>n+1),retrySave:sync};
}
