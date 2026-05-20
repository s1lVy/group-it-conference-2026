import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, index, unique, integer } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// Workshop sessions managed by admins.
// slotId maps to the fixed agenda slots (day1-morning, day1-afternoon, day2-morning).
// group: A | B | C — which group this session belongs to.
export const workshopSession = pgTable(
  "workshop_session",
  {
    id: text("id").primaryKey(),
    slotId: text("slot_id").notNull(),
    group: text("group").notNull(), // 'A' | 'B' | 'C'
    topic: text("topic").notNull(),
    location: text("location"),
    maxParticipants: integer("max_participants").notNull().default(30),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("workshop_session_slot_group_unique").on(table.slotId, table.group),
    index("workshop_session_slotId_idx").on(table.slotId),
  ],
)

// Users granted admin access (by email or userId).
export const adminUser = pgTable("admin_user", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// slotId: e.g. "day1-morning", "day1-afternoon", "day2-morning"
// workshopId: references workshopSession.id
export const enrollment = pgTable(
  "enrollment",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slotId: text("slot_id").notNull(),
    workshopId: text("workshop_id")
      .notNull()
      .references(() => workshopSession.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  },
  (table) => [
    unique("enrollment_user_slot_unique").on(table.userId, table.slotId),
    index("enrollment_userId_idx").on(table.userId),
    index("enrollment_workshopId_idx").on(table.workshopId),
  ],
);

export const workshopSessionRelations = relations(workshopSession, ({ many }) => ({
  enrollments: many(enrollment),
}));

export const enrollmentRelations = relations(enrollment, ({ one }) => ({
  user: one(user, { fields: [enrollment.userId], references: [user.id] }),
  workshop: one(workshopSession, { fields: [enrollment.workshopId], references: [workshopSession.id] }),
}));

// Non-workshop agenda items: lunch, dinner, plenary, networking etc.
// type: 'break' | 'plenary' | 'networking'
// sortOrder controls display order within a day
export const agendaSlot = pgTable("agenda_slot", {
  id: text("id").primaryKey(),
  dayId: text("day_id").notNull(), // 'day1' | 'day2'
  time: text("time").notNull(),    // e.g. '12:00', 'Evening'
  title: text("title").notNull(),
  type: text("type").notNull(),    // 'break' | 'plenary' | 'networking'
  note: text("note"),
  location: text("location"),
  sortOrder: integer("sort_order").notNull().default(0),
});
