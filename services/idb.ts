import Dexie, { Table } from 'dexie';
import { Receipt } from '../types';

export class AppDB extends Dexie {
  receipts!: Table<Receipt>; 

  constructor() {
    super('ExpenseAppDB');
  }
}

export const db = new AppDB();

// Fix for line 9: Property 'version' does not exist on type 'AppDB'.
// Moved schema definition outside of the constructor. This is an alternative, valid Dexie pattern
// that avoids potential `this` context issues within the constructor.
db.version(1).stores({
  receipts: 'id, base64, fileName' // Primary key and indexed props
});
