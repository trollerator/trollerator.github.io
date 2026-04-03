import { useState, useRef, useEffect, ChangeEvent, DragEvent } from "react";
import { Upload, Image as ImageIcon, Download, RefreshCw, Wand2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface GalleryItem {
  id: number;
  imageData: string;
  mimeType: string;
  createdAt: string;
}

export default function Home() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

  const fetchGallery = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/meme/gallery`);
      if (res.ok) {
        const data = await res.json();
        setGallery(data);
      }
    } catch {
      // ignore
    } finally {
      setLoadingGallery(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      toast({
        title: "Wrong file type",
        description: "Upload an image file (JPG, PNG, etc).",
        variant: "destructive",
      });
      return;
    }
    setFile(selectedFile);
    setResultImage(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFileSelect(e.dataTransfer.files[0]);
  };
  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFileSelect(e.target.files[0]);
  };

  const transformImage = async () => {
    if (!file) return;
    setIsTransforming(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await fetch(`${API_BASE}/api/meme/transform`, { method: "POST", body: formData });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to trollerate image");
      }
      const data = await response.json();
      if (data.b64_json && data.mimeType) {
        const dataUrl = `data:${data.mimeType};base64,${data.b64_json}`;
        setResultImage(dataUrl);
        toast({
          title: "Trollerated! 🧌",
          description: "Problem?",
          className: "bg-primary text-primary-foreground border-4 border-black shadow-md",
        });
        await fetchGallery();
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsTransforming(false);
    }
  };

  const downloadResult = () => {
    if (!resultImage) return;
    const a = document.createElement("a");
    a.href = resultImage;
    a.download = `trollerator-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadGalleryItem = (item: GalleryItem) => {
    const a = document.createElement("a");
    a.href = `data:${item.mimeType};base64,${item.imageData}`;
    a.download = `trollerator-${item.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResultImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-[100dvh] w-full p-4 md:p-8 flex flex-col items-center">
      {/* HEADER */}
      <header className="w-full max-w-5xl mb-8 md:mb-12 text-center relative">
        <div className="absolute inset-0 bg-primary/20 blur-3xl -z-10 rounded-full" />
        <h1
          className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white"
          style={{ WebkitTextStroke: "2px black", textShadow: "4px 4px 0 #000" }}
        >
          Trollerator
        </h1>
        <p className="mt-4 text-xl md:text-2xl font-bold bg-white inline-block px-4 py-2 border-4 border-black shadow-sm transform -rotate-2">
          We troll everything. No exceptions.
        </p>
      </header>

      {/* SECTION 1: TRANSFORMER */}
      <main className="w-full max-w-5xl flex-1 flex flex-col items-center">
        {error && (
          <div className="mb-6 bg-destructive text-destructive-foreground p-4 border-4 border-black font-bold flex items-center gap-3 w-full max-w-2xl shadow-sm">
            <AlertTriangle className="w-6 h-6" />
            <p>{error}</p>
          </div>
        )}

        {!previewUrl ? (
          <Card
            className={`w-full max-w-2xl border-4 border-black shadow-lg transition-all duration-200 cursor-pointer ${
              isDragging ? "bg-secondary scale-105" : "bg-card hover:-translate-y-2 hover:shadow-xl"
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <CardContent className="flex flex-col items-center justify-center py-20 px-6 text-center h-[400px]">
              <input type="file" ref={fileInputRef} onChange={onFileInputChange} accept="image/*" className="hidden" />
              <div className="bg-primary text-white p-6 rounded-full border-4 border-black shadow-sm mb-6 animate-bounce">
                <Upload className="w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black mb-2 uppercase">Drop your face here</h2>
              <p className="text-xl font-bold text-muted-foreground font-mono">or click to browse</p>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="flex flex-col md:flex-row w-full gap-6 md:gap-8 justify-center items-center md:items-stretch">
              <div className="w-full md:w-1/2 flex flex-col">
                <div className="bg-accent text-black font-black uppercase py-2 px-4 border-4 border-black border-b-0 text-center text-xl relative z-10 w-3/4 mx-auto -mb-2 shadow-sm">
                  Before (Innocent)
                </div>
                <Card className="w-full border-4 border-black shadow-md overflow-hidden bg-white flex-1 flex items-center justify-center">
                  <img src={previewUrl} alt="Original" className="w-full h-auto max-h-[500px] object-contain p-2" />
                </Card>
              </div>

              {resultImage ? (
                <div className="w-full md:w-1/2 flex flex-col">
                  <div className="bg-primary text-white font-black uppercase py-2 px-4 border-4 border-black border-b-0 text-center text-xl relative z-10 w-3/4 mx-auto -mb-2 shadow-sm transform rotate-1">
                    Trollerated 🧌
                  </div>
                  <Card className="w-full border-4 border-black shadow-md overflow-hidden bg-white flex-1 flex items-center justify-center">
                    <img src={resultImage} alt="Trollerated" className="w-full h-auto max-h-[500px] object-contain p-2" />
                  </Card>
                </div>
              ) : (
                <div className="w-full md:w-1/2 flex flex-col">
                  <div className="bg-muted text-muted-foreground font-black uppercase py-2 px-4 border-4 border-black border-b-0 text-center text-xl relative z-10 w-3/4 mx-auto -mb-2">
                    Trollerating...
                  </div>
                  <Card className="w-full border-4 border-black shadow-md border-dashed overflow-hidden bg-muted/50 flex-1 flex flex-col items-center justify-center p-8 min-h-[300px]">
                    {isTransforming ? (
                      <div className="flex flex-col items-center">
                        <RefreshCw className="w-16 h-16 animate-spin text-primary mb-6" />
                        <h3 className="text-2xl font-black text-center uppercase animate-pulse">Applying troll energy...</h3>
                        <p className="text-lg font-mono font-bold mt-2 text-center text-muted-foreground">
                          Takes ~30 seconds.<br />Good trolls take time.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center opacity-50">
                        <ImageIcon className="w-16 h-16 mb-4" />
                        <p className="text-xl font-bold font-mono">Waiting for victim...</p>
                      </div>
                    )}
                  </Card>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 mt-8 justify-center w-full max-w-2xl">
              {!isTransforming && !resultImage && (
                <Button
                  onClick={transformImage}
                  className="bg-primary hover:bg-primary/90 text-white border-4 border-black shadow-sm text-2xl font-black uppercase py-8 px-12 hover:-translate-y-1 transition-transform"
                >
                  <Wand2 className="w-8 h-8 mr-3" />
                  Trollerate!
                </Button>
              )}
              {resultImage && (
                <Button
                  onClick={downloadResult}
                  className="bg-secondary hover:bg-secondary/90 text-black border-4 border-black shadow-sm text-2xl font-black uppercase py-8 px-12 hover:-translate-y-1 transition-transform"
                >
                  <Download className="w-8 h-8 mr-3" />
                  Save Troll
                </Button>
              )}
              <Button
                onClick={reset}
                disabled={isTransforming}
                variant="outline"
                className="bg-white hover:bg-gray-100 text-black border-4 border-black shadow-sm text-xl font-bold py-8 px-8"
              >
                Next Victim
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* SECTION 2: GALLERY */}
      <section className="w-full max-w-5xl mt-16 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <h2
            className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white"
            style={{ WebkitTextStroke: "2px black", textShadow: "3px 3px 0 #000" }}
          >
            Hall of Trolls
          </h2>
          <div className="bg-primary text-white font-black px-3 py-1 border-4 border-black text-xl">
            {gallery.length}
          </div>
        </div>

        {loadingGallery ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : gallery.length === 0 ? (
          <Card className="border-4 border-black border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-2xl font-black uppercase text-muted-foreground">No trolls yet.</p>
              <p className="text-lg font-mono font-bold text-muted-foreground mt-2">Be the first victim.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {gallery.map((item) => (
              <div
                key={item.id}
                className="group relative border-4 border-black bg-white overflow-hidden shadow-md hover:-translate-y-1 hover:shadow-xl transition-all duration-200"
              >
                <img
                  src={`data:${item.mimeType};base64,${item.imageData}`}
                  alt={`Troll #${item.id}`}
                  className="w-full aspect-square object-cover"
                />
                <button
                  onClick={() => downloadGalleryItem(item)}
                  className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs font-black uppercase py-2 px-2 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download className="w-3 h-3" /> Save
                </button>
                <div className="absolute top-1 left-1 bg-black text-white text-xs font-black px-1.5 py-0.5 opacity-70">
                  #{item.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
