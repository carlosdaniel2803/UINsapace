import { useEffect, useState } from "react";
import { api } from "../api";

// GET con estado de carga/error. reload() vuelve a pedir los datos.
export function useApi(path) {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState({ key: null, data: null, error: "" });
  const key = `${path}#${tick}`;

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api(path)
      .then((data) => !cancelled && setResult({ key, data, error: "" }))
      .catch((e) => !cancelled && setResult({ key, data: null, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  return {
    data: result.data,
    error: result.key === key ? result.error : "",
    loading: !!path && result.key !== key,
    reload: () => setTick((t) => t + 1),
  };
}
