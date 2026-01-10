"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js'; 
import { Palette, MessageSquare, Save, Check, AlertCircle, Upload, X, ImageIcon, ZoomIn, ZoomOut } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';

export default function BrandingPage() {
  const [supabase] = useState(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  ));

  const [primaryColor, setPrimaryColor] = useState('#7c3aed'); 
  const [botName, setBotName] = useState('NORA');
  const [welcomeMessage, setWelcomeMessage] = useState('Hej! Vad kan jag hjälpa dig med idag?');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  // Crop state
  const [showCropModal, setShowCropModal] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [originalFileName, setOriginalFileName] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data, error } = await supabase
        .from('companies')
        .select('branding_color, bot_name, welcome_message, logo_url')
        .eq('id', user.id)
        .single();

      if (data) {
        if (data.branding_color) setPrimaryColor(data.branding_color);
        if (data.bot_name) setBotName(data.bot_name);
        if (data.welcome_message) setWelcomeMessage(data.welcome_message);
        if (data.logo_url) setLogoUrl(data.logo_url);
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // 1. Validera format
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/heic', 'image/heif'];
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'svg', 'heic'];
    
    const isValidType = allowedTypes.includes(file.type);
    const isValidExt = fileExt && allowedExts.includes(fileExt);

    if (!isValidType && !isValidExt) {
      setErrorMsg("Filformatet känns inte igen. Vi rekommenderar JPG, PNG, SVG eller HEIC.");
      return;
    }

    setOriginalFileName(file.name);

    // Read file as data URL for cropping
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result?.toString() || null);
      setShowCropModal(true);
    });
    reader.readAsDataURL(file);
    
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    if (!imageSrc || !croppedAreaPixels || !userId) return;
    
    setIsUploading(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Kunde inte skapa beskuren bild");

      // Skapa ett unikt filnamn
      const fileExt = originalFileName?.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload blob
      const { error: uploadError } = await supabase
        .storage
        .from('company_logos')
        .upload(fileName, croppedBlob, {
          contentType: 'image/jpeg', 
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase
        .storage
        .from('company_logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      setShowCropModal(false);
      setImageSrc(null);

    } catch (e: any) {
      console.error(e);
      setErrorMsg("Kunde inte ladda upp bilden.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const { error } = await supabase
      .from('companies')
      .update({
        branding_color: primaryColor,
        bot_name: botName,
        welcome_message: welcomeMessage,
        logo_url: logoUrl
      })
      .eq('id', userId);

    setIsSaving(false);

    if (error) {
      setErrorMsg('Kunde inte spara inställningar.');
      console.error(error);
    } else {
      setSuccessMsg('Dina ändringar har sparats!');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  if (isLoading) return <div className="p-8 text-slate-400">Laddar inställningar...</div>;

  return (
    <div className="grid lg:grid-cols-2 gap-8 relative">
      {/* CROP MODAL */}
      {showCropModal && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-900">Justera bild</h3>
              <button onClick={() => setShowCropModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative h-64 sm:h-80 bg-slate-900 w-full">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-500 font-medium uppercase tracking-wider">
                  <span>Zooma</span>
                  <span>{Math.round(zoom * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-slate-400" />
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                  <ZoomIn className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCropModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  onClick={handleCropSave}
                  disabled={isUploading}
                  className="flex-1 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  {isUploading ? 'Laddar upp...' : 'Klar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <header>
          <h2 className="text-2xl font-bold text-slate-900">Anpassa Utseende</h2>
          <p className="text-slate-500">Gör boten till en del av ditt varumärke.</p>
        </header>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-3">Logotyp</label>
            <div className="flex items-start gap-4">
              <div 
                className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50 relative group cursor-pointer hover:border-violet-400 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                 <div className="flex gap-2 mb-2">
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                     disabled={isUploading}
                   >
                     Välj fil...
                   </button>
                   {logoUrl && (
                     <button 
                       onClick={() => setLogoUrl(null)}
                       className="px-3 py-1.5 text-red-600 text-sm hover:underline"
                     >
                       Ta bort
                     </button>
                   )}
                 </div>
                 <p className="text-xs text-slate-500">
                   Vi stödjer JPG, PNG, SVG och HEIC.
                   <br />Bilden kommer beskäras till en cirkel.
                 </p>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".jpg,.jpeg,.png,.svg,.heic" 
              onChange={handleFileSelect}
            />
          </div>

          <div className="h-px bg-slate-100" />

          {/* Färgval */}
          <div>
            <label className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-slate-500" />
              Varumärkesfärg
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="color" 
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-12 h-12 rounded cursor-pointer border-0 p-0"
              />
              <span className="text-sm text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200 uppercase">
                {primaryColor}
              </span>
            </div>
          </div>

          {/* Bot namn */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Botens namn</label>
            <input 
              type="text" 
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none"
              placeholder="T.ex. Kundservice, Anna, Supporten"
            />
          </div>

          {/* Välkomstmeddelande */}
          <div>
            <label className="block text-sm font-medium text-slate-900 mb-2">Välkomstmeddelande</label>
            <textarea 
              rows={3}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none resize-none"
              placeholder="Vad ska boten säga först?"
            />
          </div>

          {errorMsg && (
             <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-start gap-2 text-sm animate-in fade-in slide-in-from-top-1">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm animate-in fade-in slide-in-from-top-1">
              <Check className="w-4 h-4" />
              {successMsg}
            </div>
          )}

          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {isSaving ? 'Sparar...' : <><Save className="w-4 h-4" /> Spara ändringar</>}
          </button>

        </div>
      </div>

      {/* Preview */}
      <div className="mt-8 lg:mt-0">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Förhandsvisning</h3>
        
        <div className="bg-slate-100 p-8 rounded-2xl border border-slate-200 flex items-center justify-center min-h-100">
          {/* Chat Mockup */}
          <div className="w-[320px] bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col h-112.5">
            {/* Header */}
            <div className="p-4 text-white flex items-center gap-3" style={{ backgroundColor: primaryColor }}>
              <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="Bot Logo" className="w-full h-full object-cover" />
                ) : (
                  <MessageSquare className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="font-medium text-sm">{botName}</div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 bg-slate-50 space-y-4 overflow-hidden relative">
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden" style={{ backgroundColor: primaryColor }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Bot" className="w-full h-full object-cover" />
                  ) : (
                    botName[0]
                  )}
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 text-sm text-slate-700 shadow-sm max-w-[85%]">
                  {welcomeMessage}
                </div>
              </div>
              
              <div className="flex gap-2 flex-row-reverse">
                <div className="bg-slate-200/50 p-3 rounded-2xl rounded-tr-none text-sm text-slate-800 max-w-[85%]">
                  Har ni öppet på lördagar?
                </div>
              </div>

               <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: primaryColor }}>
                  {botName[0]}
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 text-sm text-slate-700 shadow-sm max-w-[85%]">
                  Absolut! Vi har öppet 10-15 varje lördag. Välkommen in!
                </div>
              </div>

            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="h-10 bg-slate-100 rounded-full w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
