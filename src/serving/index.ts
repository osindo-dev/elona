export default {
  async fetch(): Promise<Response> {
    return new Response("elona: ok", { status: 200 });
  },
} satisfies ExportedHandler;
