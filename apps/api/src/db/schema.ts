import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  text,
  index,
  jsonb
} from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),

  email: varchar("email", { length: 255 }).notNull().unique(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, {
        onDelete: "cascade",
      }),

    // Store a hash, never the actual API key.
    keyHash: text("key_hash").notNull().unique(),

    // Useful for showing the user which key they're using
    // without exposing the secret.
    keyPrefix: varchar("key_prefix", { length: 16 }).notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    lastUsedAt: timestamp("last_used_at", {
      withTimezone: true,
    }),
  },
  (table) => ({
    accountIdIdx: index("api_keys_account_id_idx").on(table.accountId),
  }),
);

export const inboxes = pgTable(
  "inboxes",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),

    address: varchar("address", { length: 320 })
      .notNull()
      .unique(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    accountIdIdx: index("inboxes_account_id_idx").on(table.accountId),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    inboxId: uuid("inbox_id")
      .notNull()
      .references(() => inboxes.id, { onDelete: "cascade" }),

    messageId: text("message_id"),

    from: jsonb("from").notNull(),
    to: jsonb("to").notNull(),

    subject: text("subject"),

    text: text("text"),
    html: text("html"),

    date: timestamp("date", {
      withTimezone: true,
    }),

    headers: jsonb("headers"),
    attachments: jsonb("attachments"),

    receivedAt: timestamp("received_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    inboxIdIdx: index("messages_inbox_id_idx").on(table.inboxId),
    messageIdIdx: index("messages_message_id_idx").on(table.messageId),
  }),
);