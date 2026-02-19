/**
 * Retry a Supabase query with exponential backoff
 * CORS errors are NOT retryable - they fail immediately
 */
export async function retrySupabaseQuery(queryFn, maxRetries = 2, delay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn();
      
      // Check if result has error property (Supabase error)
      if (result && result.error) {
        const errorMessage = result.error.message || '';
        const errorCode = result.error.code || '';
        
        // CORS, JWT, and Auth errors are NOT retryable - fail immediately
        if (errorMessage.includes('CORS') || 
            errorMessage.includes('Cross-Origin') ||
            errorCode === 'PGRST301' || 
            errorMessage.includes('JWT') ||
            errorMessage.includes('Authorization') ||
            errorMessage.includes('Authentication')) {
          console.error('[v0] Non-retryable Supabase error (not retrying):', errorMessage);
          throw result.error;
        }
        
        // Network errors ARE retryable
        throw result.error;
      }
      
      // Success!
      return result;
      
    } catch (error) {
      lastError = error;
      
      const errorMsg = error.message || '';
      
      // Don't retry CORS/Auth errors
      if (errorMsg.includes('CORS') || 
          errorMsg.includes('Cross-Origin') ||
          errorMsg.includes('JWT') ||
          errorMsg.includes('Authentication') ||
          errorMsg.includes('Authorization')) {
        console.error('[v0] CORS/Auth error - not retrying:', errorMsg);
        throw error;
      }
      
      // For network errors, retry
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.log(`[v0] Retry ${attempt}/${maxRetries} - waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error(`[v0] All ${maxRetries} retries exhausted. Last error:`, errorMsg);
      }
    }
  }
  
  // All retries failed
  throw lastError;
}

export async function fetchWithTimeout(url, options = {}, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}