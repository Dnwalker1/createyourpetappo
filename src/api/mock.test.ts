import { ApiError } from './types';
import { createMockApi } from './mock';

jest.useFakeTimers();

function setup() {
  let clock = Date.UTC(2026, 8, 24, 12, 0);
  const api = createMockApi(() => clock);
  const advance = (ms: number) => {
    clock += ms;
  };
  // Attach handlers before advancing timers so expected rejections are caught.
  const run = async <T,>(p: Promise<T>) => {
    const settled = p.then(
      (value) => ({ ok: true as const, value }),
      (error: unknown) => ({ ok: false as const, error }),
    );
    await jest.runAllTimersAsync();
    const result = await settled;
    if (!result.ok) throw result.error;
    return result.value;
  };
  return { api, advance, run };
}

async function makeDesign(ctx: ReturnType<typeof setup>, text?: string) {
  const { photoId } = await ctx.run(ctx.api.uploadPhoto('dev', { uri: 'file://pet.jpg' }));
  return ctx.run(ctx.api.createDesign('dev', { photoId, styleId: 'stamp', text }));
}

describe('mock backend', () => {
  it('rejects protected names in text', async () => {
    const ctx = setup();
    await expect(makeDesign(ctx, 'Chewy Skywalker')).rejects.toMatchObject({ code: 'TEXT_REJECTED' });
  });

  it('allows one design in progress at a time', async () => {
    const ctx = setup();
    await makeDesign(ctx);
    await expect(makeDesign(ctx)).rejects.toMatchObject({ code: 'DESIGN_IN_PROGRESS' });
    ctx.advance(5000);
    await expect(makeDesign(ctx)).resolves.toHaveProperty('designId');
  });

  it('stops at five designs and reports when the next unlocks', async () => {
    const ctx = setup();
    for (let i = 0; i < 5; i++) {
      await makeDesign(ctx);
      ctx.advance(60 * 60 * 1000);
    }
    const err = (await makeDesign(ctx).catch((e) => e)) as ApiError;
    expect(err.code).toBe('LIMIT_REACHED');
    expect(err.unlocksAt).toBe(Date.UTC(2026, 8, 25, 12, 0));
    const limits = await ctx.api.getLimits('dev');
    expect(limits.available).toBe(0);
  });
});
