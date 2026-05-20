import { config } from 'dotenv'
config({ path: ['.env.local', '.env'] })

import { drizzle } from 'drizzle-orm/node-postgres'
import { agendaSlot } from './src/db/schema.ts'

const db = drizzle(process.env.DATABASE_URL!)

function id() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const slots = [
  { id: id(), dayId: 'day1', time: '12:00', title: 'Lunch Break', type: 'break', note: 'All groups', location: null, sortOrder: 20 },
  { id: id(), dayId: 'day1', time: 'Evening', title: 'Dinner & Networking', type: 'networking', note: 'All groups', location: null, sortOrder: 40 },
  { id: id(), dayId: 'day2', time: '12:00', title: 'Lunch Break', type: 'break', note: 'All groups', location: null, sortOrder: 20 },
  { id: id(), dayId: 'day2', time: '13:00', title: 'QA-Sessions & Wrap Up', type: 'plenary', note: 'Plenary — All Groups', location: 'Main Hall', sortOrder: 30 },
]

await db.insert(agendaSlot).values(slots)
console.log('Seeded', slots.length, 'agenda slots')
process.exit(0)
