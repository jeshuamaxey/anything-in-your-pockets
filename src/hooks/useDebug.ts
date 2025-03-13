// detect is debug is present in the url hash and if so, return debug true, else false

import { useEffect, useState } from "react";

export const useDebug = () => {
  const [debug, setDebug] = useState(false);
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('debug')) {
      setDebug(true);
    }
  }, []);
  return debug;
};

export default useDebug;
