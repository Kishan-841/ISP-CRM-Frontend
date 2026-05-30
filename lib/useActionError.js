import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

/**
 * Pairs with any store action that returns { success, data, error }.
 *
 * Usage:
 *   const action = useActionError();
 *   const onClick = async () => {
 *     const r = await action.runAction(() => saveLead(payload));
 *     if (r.success) closeModal();
 *   };
 *   return (
 *     <>
 *       <Button onClick={onClick}>Save</Button>
 *       {action.error && <InlineError message={action.error} onDismiss={action.clearError} />}
 *     </>
 *   );
 *
 * For local validation errors that bypass the network:
 *   if (!email) return action.fail('Please enter an email.');
 */
export function useActionError() {
  const [error, setError] = useState(null);

  const clearError = useCallback(() => setError(null), []);

  const fail = useCallback((msg) => {
    const m = msg || 'Something went wrong.';
    setError(m);
    toast.error(m);
  }, []);

  const runAction = useCallback(async (actionFn, opts = {}) => {
    const { silent = false, toastOnError = true } = opts;
    setError(null);
    try {
      const result = await actionFn();
      if (result?.success === false) {
        const msg = result.error || 'Something went wrong.';
        if (!silent) {
          setError(msg);
          if (toastOnError) toast.error(msg);
        }
        return result;
      }
      return result;
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Something went wrong.';
      if (!silent) {
        setError(msg);
        if (toastOnError) toast.error(msg);
      }
      return { success: false, error: msg };
    }
  }, []);

  return { error, setError, clearError, runAction, fail };
}
