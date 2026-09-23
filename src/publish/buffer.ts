/**
 * Cliente de la API GraphQL de Buffer (https://api.buffer.com/graphql).
 * Auth: API key personal como Bearer (BUFFER_API_KEY).
 *
 * Docs: https://developers.buffer.com
 */

const ENDPOINT = "https://api.buffer.com/graphql";

export type BufferOrganization = { id: string; name: string };

export type BufferChannel = {
  id: string;
  name: string;
  /** servicio de la red: instagram | linkedin | twitter | ... */
  service: string;
  isDisconnected?: boolean;
  isLocked?: boolean;
};

export type BufferPost = {
  id: string;
  status: string;
  dueAt: string | null;
  text: string;
};

export type BufferAsset =
  | { image: { url: string } }
  | { video: { url: string } };

export type BufferPostMode = "addToQueue" | "shareNow" | "shareNext" | "customScheduled";

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const key = process.env.BUFFER_API_KEY;
  if (!key) {
    throw new Error("BUFFER_API_KEY no está definida. Agregala al .env (ver .env.example).");
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as {
    data?: T;
    errors?: { message: string }[];
  };
  if (json.errors?.length) {
    throw new Error(`[buffer] ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) throw new Error("[buffer] respuesta sin datos");
  return json.data;
}

export async function getOrganizations(): Promise<BufferOrganization[]> {
  const data = await gql<{ account: { organizations: BufferOrganization[] } }>(
    `query { account { organizations { id name } } }`
  );
  return data.account.organizations;
}

export async function getChannels(organizationId: string): Promise<BufferChannel[]> {
  const data = await gql<{ channels: BufferChannel[] }>(
    `query($org: OrganizationId!){ channels(input:{ organizationId:$org }){ id name service isDisconnected isLocked } }`,
    { org: organizationId }
  );
  return data.channels;
}

export type CreateBufferPostArgs = {
  channelId: string;
  text: string;
  mode?: BufferPostMode;
  /** ISO 8601 en UTC, solo para customScheduled */
  dueAt?: string;
  /** true = queda como borrador en Buffer */
  saveToDraft?: boolean;
  assets?: BufferAsset[];
  metadata?: Record<string, unknown>;
};

export async function createPost(args: CreateBufferPostArgs): Promise<BufferPost> {
  const input: Record<string, unknown> = {
    channelId: args.channelId,
    text: args.text,
    schedulingType: "automatic",
    mode: args.mode ?? "addToQueue",
  };
  if (args.dueAt) input.dueAt = args.dueAt;
  if (args.saveToDraft) input.saveToDraft = true;
  if (args.assets?.length) input.assets = args.assets;
  if (args.metadata) input.metadata = args.metadata;

  const data = await gql<{
    createPost: { __typename: string; post?: BufferPost; message?: string };
  }>(
    `mutation($input: CreatePostInput!){
      createPost(input:$input){
        __typename
        ... on PostActionSuccess { post { id status dueAt text } }
        ... on MutationError { message }
      }
    }`,
    { input }
  );
  const r = data.createPost;
  if (r.__typename !== "PostActionSuccess" || !r.post) {
    throw new Error(`[buffer] ${r.message ?? "no se pudo crear el post"}`);
  }
  return r.post;
}

export async function deletePost(id: string): Promise<void> {
  const data = await gql<{
    deletePost: { __typename: string; message?: string };
  }>(
    `mutation($input: DeletePostInput!){
      deletePost(input:$input){
        __typename
        ... on MutationError { message }
      }
    }`,
    { input: { id } }
  );
  if (data.deletePost.__typename !== "DeletePostSuccess") {
    throw new Error(`[buffer] ${data.deletePost.message ?? "no se pudo borrar el post"}`);
  }
}

export type BufferMetric = { type: string; name: string; value: number };

export type BufferPostDetail = {
  id: string;
  status: string;
  channelService: string | null;
  metricsUpdatedAt: string | null;
  metrics: BufferMetric[] | null;
};

/** trae un post con sus métricas (insights). null si la red no expone métricas. */
export async function getPostDetail(id: string): Promise<BufferPostDetail> {
  const data = await gql<{ post: BufferPostDetail }>(
    `query($id: PostId!){
      post(input:{ id:$id }){
        id status channelService metricsUpdatedAt
        metrics { type name value }
      }
    }`,
    { id }
  );
  return data.post;
}
