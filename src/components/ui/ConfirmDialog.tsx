'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

type ConfirmOptions = {
  titolo?: string;
  confermaLabel?: string;
  annullaLabel?: string;
  pericoloso?: boolean;
};

type ConfirmState = ConfirmOptions & {
  messaggio: string;
  resolve: (value: boolean) => void;
};

type ConfirmContextValue = (messaggio: string, opzioni?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback<ConfirmContextValue>((messaggio, opzioni) => {
    return new Promise<boolean>((resolve) => {
      setState({ messaggio, resolve, ...opzioni });
    });
  }, []);

  const chiudi = (valore: boolean) => {
    state?.resolve(valore);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  state.pericoloso ? 'bg-rose-50 text-[#E05353]' : 'bg-amber-50 text-amber-600'
                }`}
              >
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <div>
                {state.titolo && <p className="font-extrabold text-sm text-[#1E242B] mb-1">{state.titolo}</p>}
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{state.messaggio}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => chiudi(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {state.annullaLabel || 'Annulla'}
              </button>
              <button
                type="button"
                onClick={() => chiudi(true)}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors ${
                  state.pericoloso ? 'bg-[#E05353] hover:bg-[#c94545]' : 'bg-[#1E242B] hover:bg-black'
                }`}
              >
                {state.confermaLabel || 'Conferma'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm va usato dentro <ConfirmProvider>');
  return ctx;
}
