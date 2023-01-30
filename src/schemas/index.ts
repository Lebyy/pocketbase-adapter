export const UserSchema = [
  {
    name: "name",
    type: "text",
    required: false,
  },
  {
    name: "email",
    type: "email",
    required: false,
  },
  {
    name: "emailVerified",
    type: "date",
    required: false,
  },
  {
    name: "image",
    type: "url",
    required: false,
  },
]

export const AccountSchema = [
  {
    name: "userId",
    type: "relation",
    required: false,
    options: {
      maxSelect: 1,
      collectionId: "users",
      cascadeDelete: true,
    },
  },
  {
    name: "type",
    type: "text",
    required: false,
  },
  {
    name: "provider",
    type: "text",
    required: false,
  },
  {
    name: "providerAccountId",
    type: "text",
    required: false,
  },
  {
    name: "refreshToken",
    type: "text",
    required: false,
  },
  {
    name: "access_token",
    type: "text",
    required: false,
  },
  {
    name: "expires_at",
    type: "number",
    required: false,
  },
  {
    name: "token_type",
    type: "text",
    required: false,
  },
  {
    name: "scope",
    type: "text",
    required: false,
  },
  {
    name: "id_token",
    type: "text",
    required: false,
  },
  {
    name: "session_state",
    type: "text",
    required: false,
  },
  {
    name: "oauth_token_secret",
    type: "text",
    required: false,
  },
  {
    name: "oauth_token",
    type: "text",
    required: false,
  },
]

export const SessionSchema = [
  {
    name: "userId",
    type: "relation",
    required: false,
    options: {
      maxSelect: 1,
      collectionId: "users",
      cascadeDelete: true,
    },
  },
  {
    name: "expires",
    type: "date",
    required: false,
  },
  {
    name: "sessionToken",
    type: "text",
    required: false,
  }
]

export const VerificationTokensSchema = [
  {
    name: "identifier",
    type: "text",
    required: false,
  },
  {
    name: "token",
    type: "text",
    required: false,
  },
  {
    name: "expires",
    type: "date",
    required: false,
  },
]