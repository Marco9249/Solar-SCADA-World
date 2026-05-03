import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface ImportCtx {
  objContent: string | null;
  objFileName: string;
  setObjContent: (content: string | null, fileName?: string) => void;
  objPosition: [number, number, number];
  setObjPosition: (pos: [number, number, number]) => void;
}

const ImportContext = createContext<ImportCtx | null>(null);

export function ImportProvider({ children }: { children: ReactNode }) {
  const [objContent,  setObjContentState]  = useState<string | null>(null);
  const [objFileName, setObjFileName]       = useState<string>("");
  const [objPosition, setObjPosition]       = useState<[number, number, number]>([0, 0, 0]);

  const setObjContent = useCallback((content: string | null, fileName = "") => {
    setObjContentState(content);
    setObjFileName(fileName);
  }, []);

  return (
    <ImportContext.Provider value={{ objContent, objFileName, setObjContent, objPosition, setObjPosition }}>
      {children}
    </ImportContext.Provider>
  );
}

export function useImport() {
  const ctx = useContext(ImportContext);
  if (!ctx) throw new Error("useImport must be used inside ImportProvider");
  return ctx;
}
