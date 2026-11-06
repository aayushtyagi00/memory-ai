import React,{useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
export function Dialog({children,label,onClose,className=''}:{children:React.ReactNode;label:string;onClose:()=>void;className?:string}){
 const ref=useRef<HTMLDialogElement>(null);const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.showModal();return()=>{dialog?.close();previous?.focus();};},[]);
 return createPortal(<dialog ref={ref} aria-label={label} onCancel={e=>{e.preventDefault();close.current();}} className={`fixed inset-0 m-0 max-w-none max-h-none w-screen h-screen bg-transparent text-text-primary backdrop:bg-black/80 p-0 ${className}`}><div className="min-h-full flex items-center justify-center p-4" onClick={e=>{if(e.target===e.currentTarget)close.current();}}>{children}</div></dialog>,document.body);
}
