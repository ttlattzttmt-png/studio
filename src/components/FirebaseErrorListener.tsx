'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * تم تعطيل الـ Throw التلقائي لمنع انهيار الموقع بالكامل.
 * بدلاً من ذلك، سنكتفي بتسجيل الخطأ في الكونسول لضمان استمرارية عمل المنصة.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.warn("Firebase Permission Suppressed:", error.request.path);
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);
    return () => errorEmitter.off('permission-error', handleError);
  }, []);

  return null;
}