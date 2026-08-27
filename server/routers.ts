import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getMangaDexChapters, getMangaDexManifest, getMangaDexTitle, searchMangaDex } from "./mangadex";

const mangaDexId = z.string().uuid();

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  mangaDex: router({
    search: publicProcedure.input(z.object({ query: z.string().trim().min(2).max(100) })).query(({ input }) => searchMangaDex(input.query)),
    title: publicProcedure.input(z.object({ id: mangaDexId })).query(({ input }) => getMangaDexTitle(input.id)),
    chapters: publicProcedure.input(z.object({ id: mangaDexId })).query(({ input }) => getMangaDexChapters(input.id)),
    manifest: publicProcedure.input(z.object({ chapterId: mangaDexId, quality: z.enum(["data", "data-saver"]) })).query(({ input }) => getMangaDexManifest(input.chapterId, input.quality)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
