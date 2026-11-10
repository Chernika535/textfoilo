'use client';
import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Upload, X } from 'lucide-react';
import { safeUrl } from '@/lib/model';
export function MediaUpload({ value='', onChange, video=false, compact=false }: { value?:string; onChange:(v:string)=>void; video?:boolean;compact?:boolean }) {
  const input=useRef<HTMLInputElement>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function upload(file?:File){
    if(!file)return;setError('');if(file.size>20_000_000){setError('Максимальный размер — 20 МБ.');return;}
    setBusy(true);
    try {const form=new FormData();form.append('file',file);const res=await fetch('/api/media',{method:'POST',body:form});const data=await res.json() as {error?:string;url:string};if(!res.ok)throw new Error(data.error || 'Не удалось загрузить файл.');onChange(data.url);}
    catch(e){setError(e instanceof Error?e.message:'Не удалось загрузить файл.');}
    finally{setBusy(false);if(input.current)input.current.value='';}
  }
  return <div className={`media-upload ${compact?'compact':''}`}><input ref={input} type="file" hidden accept={video?'video/mp4,video/webm':'image/jpeg,image/png,image/webp,image/gif'} onChange={e=>upload(e.target.files?.[0])}/>{value&&safeUrl(value)&&!video?<div className="uploaded-image"><img src={safeUrl(value)} alt="Обложка работы"/><button type="button" aria-label="Убрать изображение" onClick={()=>onChange('')}><X size={16}/></button></div>:<button className="upload-dropzone" type="button" disabled={busy} onClick={()=>input.current?.click()}>{busy?<LoaderCircle size={22} className="spin"/>:video?<Upload size={22}/>:<ImagePlus size={22}/>}<strong>{busy?'Загружаем…':video?'Загрузить готовый ролик':'Загрузить изображение'}</strong><small>{video?'MP4, WebM · до 20 МБ':'JPEG, PNG, WebP, GIF · до 20 МБ'}</small></button>}{value&&video&&<div className="uploaded-video"><span>Видео загружено</span><button type="button" onClick={()=>onChange('')}>Убрать</button></div>}{value&&!video&&<button type="button" className="text-button" disabled={busy} onClick={()=>input.current?.click()}>Заменить изображение</button>}{error&&<p className="form-error" role="alert">{error}</p>}</div>;
}
