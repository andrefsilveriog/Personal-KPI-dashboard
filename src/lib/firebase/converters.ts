import type { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions } from "firebase/firestore";

export function createFirestoreConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(modelObject: T): DocumentData {
      const { id: _id, ...data } = modelObject;
      void _id;
      return data;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      const data = snapshot.data(options) as Omit<T, "id">;
      return {
        id: snapshot.id,
        ...data
      } as T;
    }
  };
}
