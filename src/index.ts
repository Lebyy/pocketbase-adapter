import type {
  Adapter,
  AdapterUser,
  AdapterAccount,
  AdapterSession,
  VerificationToken,
} from "next-auth/adapters"
import type {
  PocketBaseAccount,
  PocketBaseSession,
  PocketBaseUser,
  PocketBaseVerificationToken,
  Schema,
} from "./pocketbase.types"
import type PocketBase from "pocketbase"
import { format } from "./pocketbase.utils";

import {
  UserSchema,
  AccountSchema,
  SessionSchema,
  VerificationTokensSchema,
} from "./schemas"

let checkedForCollections = false

export interface PocketBaseAdapterOptions {
  collections?: {
    Users?: string
    Accounts?: string
    Sessions?: string
    VerificationTokens?: string
  }
  auth?: {
    email?: string
    password?: string
  }
}

export const defaultCollections: Required<
  Required<PocketBaseAdapterOptions>["collections"]
> = {
  Users: "users",
  Accounts: "accounts",
  Sessions: "sessions",
  VerificationTokens: "verification_tokens",
}

async function createCollectionIfNotExists(
  client: PocketBase,
  collectionName: string
) {
  const collection = await client.collections
    .getOne(collectionName, { $autoCancel: false })
    .catch(() => {})

  const schema =
    collectionName === defaultCollections.Users
      ? (UserSchema as Schema[])
      : collectionName === defaultCollections.Accounts
      ? (AccountSchema as Schema[])
      : collectionName === defaultCollections.Sessions
      ? (SessionSchema as Schema[])
      : collectionName === defaultCollections.VerificationTokens
      ? (VerificationTokensSchema as Schema[])
      : ([] as Schema[])

  if (!collection) {
    // If schema array contains schema.options.collectionId then replace with collection id of the appropriate collection
    // The collectionId will contain the name of the collection, so we need to replace it with the id of the collection
    // Example: schema.options.collectionId = "users" => schema.options.collectionId = "1234567890"
    // This is because PocketBase requires the id of the collection, not the name of the collection
    for (let i = 0; i < schema.length; i++) {
      // Check if schema[i].options is not empty and if it contains collectionId, use Object.keys
      // to check if collectionId is a key in schema[i].options
      if (
        schema[i].options &&
        schema[i].options?.collectionId &&
        schema[i].options?.collectionId !== ""
      ) {
        const collectionId = await client.collections
          .getOne(
            // Get the name of the collection from the schema, it can be different so map it to the correct collection
            schema[i].options.collectionId === defaultCollections.Users
              ? defaultCollections.Users
              : schema[i].options.collectionId === defaultCollections.Accounts
              ? defaultCollections.Accounts
              : schema[i].options.collectionId === defaultCollections.Sessions
              ? defaultCollections.Sessions
              : schema[i].options.collectionId ===
                defaultCollections.VerificationTokens
              ? defaultCollections.VerificationTokens
              : "",
            { $autoCancel: false }
          )
          .then((collection) => collection.id)
          .catch(() => {})
        if(collectionId) schema[i].options.collectionId = collectionId
      }
    }

    return await client.collections.create(
      {
        name: collectionName,
        schema,
      },
      { $autoCancel: false }
    )
  }

  // If collection exists, check if schema is correct and update if not correct
  // else create collection with correct schema
  if (
    !collection.schema.every(
      (field, index) =>
        field.name === schema[index].name &&
        field.type === schema[index].type &&
        field.required === schema[index].required
    )
  ) {
    for (let i = 0; i < schema.length; i++) {
      if (
        schema[i].options &&
        schema[i].options?.collectionId &&
        schema[i].options?.collectionId !== ""
      ) {
        const collectionId = await client.collections
          .getOne(
            // Get the name of the collection from the schema, it can be different so map it to the correct collection
            schema[i].options.collectionId === defaultCollections.Users
              ? defaultCollections.Users
              : schema[i].options.collectionId === defaultCollections.Accounts
              ? defaultCollections.Accounts
              : schema[i].options.collectionId === defaultCollections.Sessions
              ? defaultCollections.Sessions
              : schema[i].options.collectionId ===
                defaultCollections.VerificationTokens
              ? defaultCollections.VerificationTokens
              : "",
            { $autoCancel: false }
          )
          .then((collection) => collection.id)
          .catch(() => {})
        if (collectionId) schema[i].options.collectionId = collectionId
      }
    }
    client.collections
      .update(
        collectionName,
        {
          schema,
        },
        { $autoCancel: false }
      )
      .catch(() => {})
  }

  return collection
}

export function PocketBaseAdapter(
  client: PocketBase,
  options: PocketBaseAdapterOptions = {}
): Adapter {
  const { collections } = options

  const db = (async () => {
    const c = {
      ...defaultCollections,
      ...collections,
    }

    if (options.auth?.email && options.auth?.password) {
      await client.admins.authWithPassword(
        options.auth.email,
        options.auth.password
      )
    }

    if (!checkedForCollections) {
      await Promise.all([
        createCollectionIfNotExists(client, c.Users),
        createCollectionIfNotExists(client, c.Accounts),
        createCollectionIfNotExists(client, c.Sessions),
        createCollectionIfNotExists(client, c.VerificationTokens),
      ])
      checkedForCollections = true
    }

    return {
      U: client.collection(c.Users),
      A: client.collection(c.Accounts),
      S: client.collection(c.Sessions),
      V: client.collection(c.VerificationTokens),
    }
  })()

  return {
    async createUser(user) {
      const pb_user = await(await db)
        .U.create<PocketBaseUser>({
          ...user,
          emailVerified: user.emailVerified?.toISOString().replace("T", " "),
        })
        .catch(() => {
          throw new Error(
            "[PocketBase Next-Auth Adapter] Error creating user - see pocketbase logs"
          );
        });

      if (pb_user.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error creating user in database - see pocketbase logs"
        )

      return format<AdapterUser>(pb_user);
    },
    async getUser(id) {
      const pb_user = await (
        await db
      ).U.getOne<PocketBaseUser>(id).catch(() => {
        return null
      })
      if (!pb_user) return null

      if (pb_user.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error getting user from database - see pocketbase logs"
        )

      return format<AdapterUser>(pb_user);
    },
    async getUserByEmail(email) {
      const pb_user = await (
        await db
      ).U.getFirstListItem<PocketBaseUser>(`email="${email}"`).catch(() => {
        return null
      })
      if (!pb_user) return null

      if (pb_user.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error getting user from database using email filter - see pocketbase logs"
        )

      return format<AdapterUser>(pb_user);
    },
    async getUserByAccount({ providerAccountId, provider }) {
      const pb_account = await (
        await db
      ).A.getFirstListItem<PocketBaseAccount>(
        `provider="${provider}" && providerAccountId="${providerAccountId}"`
      ).catch(() => {
        return null
      })

      if (!pb_account) return null

      if (pb_account.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error getting user from database by account filter - see pocketbase logs"
        )

      const pb_user = await (
        await db
      ).U.getOne<PocketBaseUser>(pb_account.userId).catch(() => {
        return null
      })

      if (!pb_user) return null

      if (pb_user.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error getting user from database within account filter function - see pocketbase logs"
        )

      return format<AdapterUser>(pb_user);
    },
    async updateUser(user) {
      const pb_user = await(await db)
        .U.update<PocketBaseUser>(user.id as string, {
          ...user,
          email_verified: user.emailVerified?.toISOString().replace("T", " "),
        })
        .catch(() => {
          throw new Error(
            "[PocketBase Next-Auth Adapter] Error updating user - see pocketbase logs"
          );
        });

      if (pb_user.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error updating user in database - see pocketbase logs"
        )

      return format<AdapterUser>(pb_user);
    },
    async deleteUser(userId) {
      await (
        await db
      ).U.delete(userId).catch(() => {
        return null
      })

      return
    },
    async linkAccount(account) {
      const pb_account = await(await db)
        .A.create<PocketBaseAccount>({
          ...account,
        })
        .catch(() => {
          throw new Error(
            "[PocketBase Next-Auth Adapter] Error creating account in database - see pocketbase logs"
          );
        });

      if (pb_account.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error linking account in database - see pocketbase logs"
        )

      return format<AdapterAccount>(pb_account);
    },
    async unlinkAccount({ providerAccountId, provider }) {
      const pb_account = await (
        await db
      ).A.getFirstListItem<PocketBaseAccount>(
        `providerAccountId="${providerAccountId} && provider=${provider}"`
      ).catch(() => {
        return undefined
      })

      if (!pb_account) return

      await (
        await db
      ).A.delete(pb_account.id).catch(() => {
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error unlinking account in database - see pocketbase logs"
        )
      })
      return
    },
    async createSession(session) {
      const pb_session = await(await db)
        .S.create<PocketBaseSession>({
          ...session,
          expires: session.expires.toISOString().replace("T", " "),
        })
        .catch(() => {
          throw new Error(
            "[PocketBase Next-Auth Adapter] Error creating session in database - see pocketbase logs"
          );
        });

      if (pb_session.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error creating session in database - see pocketbase logs"
        )

      return format<AdapterSession>(pb_session);
    },
    async getSessionAndUser(sessionToken) {
      const pb_session = await (
        await db
      ).S.getFirstListItem<PocketBaseSession>(
        `sessionToken="${sessionToken}"`
      ).catch(() => {
        return null
      })
      if (!pb_session) return null

      if (pb_session.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error retrieving session from database - see pocketbase logs"
        )

      const pb_user = await (
        await db
      ).U.getOne<PocketBaseUser>(pb_session.userId).catch(() => {
        return null
      })
      if (!pb_user) return null

      if (pb_user.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error retrieving user from database - see pocketbase logs"
        )

      const session = format<AdapterSession>(pb_session);
      const user = format<AdapterUser>(pb_user);
      return {
        session,
        user,
      };
    },
    async updateSession(session) {
      const record = await (
        await db
      ).S.getFirstListItem<PocketBaseSession>(
        `sessionToken="${session.sessionToken}"`
      ).catch(() => {
        return null
      })

      if (!record) return null

      const pb_session = await (
        await db
      ).S.update<PocketBaseSession>(record.id, {
        expires: session.expires?.toISOString().replace("T", " "),
        sessionToken: session.sessionToken,
        userId: session.userId,
      }).catch(() => {
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error updating session in database - see pocketbase logs"
        )
      })

      if (pb_session.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error updating session in database - see pocketbase logs"
        )

      return format<AdapterSession>(pb_session);
    },
    async deleteSession(sessionToken) {
      const record = await (
        await db
      ).S.getFirstListItem<PocketBaseSession>(
        `sessionToken="${sessionToken}"`
      ).catch(() => {
        return null
      })

      if (!record) return null

      await (await db).S.delete(record.id).catch(() => {})

      return
    },
    async createVerificationToken(verificationToken) {
      const pb_veriToken = await(await db)
        .V.create<PocketBaseVerificationToken>({
          ...verificationToken,
          expires: verificationToken.expires.toISOString().replace("T", " "),
        })
        .catch(() => {
          throw new Error(
            "[PocketBase Next-Auth Adapter] Error creating verification token in database - see pocketbase logs"
          );
        });

      if (pb_veriToken.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error creating verification token in database - see pocketbase logs"
        )

      return format<VerificationToken>(pb_veriToken);
    },
    async useVerificationToken({ identifier, token }) {
      const pb_veriToken = await (
        await db
      ).V.getFirstListItem<PocketBaseVerificationToken>(
        `identifier="${identifier}" && token="${token}"`
      ).catch(() => {
        return null
      })

      if (!pb_veriToken) return null

      if (pb_veriToken.code)
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error retrieving verification token from database - see pocketbase logs"
        )

      const success = await (
        await db
      ).V.delete(pb_veriToken.id).catch(() => {
        return false
      })

      if (success) {
        // @ts-expect-error internal id's are not to be returned with the rest of the token
        const { id, ...returnVal } = format<VerificationToken>(pb_veriToken);
        return returnVal;
      } else {
        throw new Error(
          "[PocketBase Next-Auth Adapter] Error unable to delete verificationToken from database - see pocketbase logs"
        )
      }
    },
  }
}
