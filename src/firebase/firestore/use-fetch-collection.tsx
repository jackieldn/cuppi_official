'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  getDocs,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { WithId } from './use-collection';

/**
 * Interface for the return value of the useFetchCollection hook.
 * @template T Type of the document data.
 */
export interface UseFetchCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to fetch a Firestore collection or query once.
 * Handles nullable references/queries.
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted targetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence. Also make sure that it's dependencies are stable
 * references
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseFetchCollectionResult<T>} Object with data, isLoading, error.
 */
export function useFetchCollection<T = any>(
    targetRefOrQuery: (CollectionReference<DocumentData> | Query<DocumentData>) | null | undefined,
): UseFetchCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start with loading true
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!targetRefOrQuery) {
      setData(null);
      setIsLoading(false); // If no query, we are technically "done" loading nothing? Or should it be true? useCollection sets it to false.
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    getDocs(targetRefOrQuery)
      .then((snapshot: QuerySnapshot<DocumentData>) => {
        if (!isMounted) return;
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setIsLoading(false);
      })
      .catch((error: FirestoreError) => {
        if (!isMounted) return;

        const path: string =
          targetRefOrQuery.type === 'collection'
            ? (targetRefOrQuery as CollectionReference).path
            : (targetRefOrQuery as unknown as InternalQuery)._query.path.canonicalString()

        const contextualError = new FirestorePermissionError({
          operation: 'list',
          path,
        })

        setError(contextualError)
        setData(null)
        setIsLoading(false)

        console.error('Firestore permission error:', contextualError);
        errorEmitter.emit('permission-error', contextualError);
      });

    return () => {
      isMounted = false;
    };
  }, [targetRefOrQuery]);

  return { data, isLoading, error };
}
