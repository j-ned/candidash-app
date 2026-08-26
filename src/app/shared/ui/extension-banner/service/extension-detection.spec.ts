import { TestBed } from '@angular/core/testing';
import { ExtensionDetection } from './extension-detection';
import { Config } from '@core/services/config';

describe('ExtensionDetection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function setup(extensionId: string | undefined): ExtensionDetection {
    TestBed.configureTestingModule({
      providers: [ExtensionDetection, { provide: Config, useValue: { extensionId } }],
    });
    return TestBed.inject(ExtensionDetection);
  }

  it('is unavailable when no extensionId is configured', () => {
    // Given
    const detection = setup(undefined);

    // When
    detection.check();

    // Then
    expect(detection.status()).toBe('unavailable');
  });

  it('is unavailable when chrome.runtime is not present (non-Chromium browser)', () => {
    // Given
    vi.stubGlobal('chrome', undefined);
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();

    // Then
    expect(detection.status()).toBe('unavailable');
  });

  it('is installed when the extension replies with pong before the timeout', async () => {
    // Given
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (
          _extensionId: string,
          _message: unknown,
          callback: (reply: unknown) => void,
        ) => callback({ pong: true }),
      },
    });
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();
    // A real macrotask boundary drains every pending microtask first (the
    // sendMessage callback resolving pingReply, Promise.race's own .then(),
    // and the .finally() that clears the pending timeout), regardless of how
    // many ticks that chain happens to need.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then
    expect(detection.status()).toBe('installed');
  });

  it('is not-installed when the reply is malformed', async () => {
    // Given
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (
          _extensionId: string,
          _message: unknown,
          callback: (reply: unknown) => void,
        ) => callback({ somethingElse: true }),
      },
    });
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Then
    expect(detection.status()).toBe('not-installed');
  });

  it('is not-installed when the extension does not reply before the timeout', async () => {
    // Given
    vi.useFakeTimers();
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: () => {
          // no callback invocation — simulates an uninstalled/unresponsive extension
        },
      },
    });
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();
    await vi.advanceTimersByTimeAsync(500);

    // Then
    expect(detection.status()).toBe('not-installed');
  });

  it('clears the pending timeout once the extension replies before it fires', async () => {
    // Given
    vi.useFakeTimers();
    vi.stubGlobal('chrome', {
      runtime: {
        sendMessage: (
          _extensionId: string,
          _message: unknown,
          callback: (reply: unknown) => void,
        ) => callback({ pong: true }),
      },
    });
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();
    await vi.advanceTimersByTimeAsync(0);

    // Then
    expect(detection.status()).toBe('installed');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not re-check once a status has been resolved', async () => {
    // Given
    const sendMessage = vi.fn(
      (_id: string, _msg: unknown, cb: (reply: unknown) => void) => cb({ pong: true }),
    );
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();
    await Promise.resolve();
    await Promise.resolve();
    detection.check();

    // Then
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  describe('webStoreUrl', () => {
    it('is null when no extensionId is configured', () => {
      // Given
      const detection = setup(undefined);

      // Then
      expect(detection.webStoreUrl()).toBeNull();
    });

    it('is the Chrome Web Store detail URL when extensionId is configured', () => {
      // Given
      const detection = setup('abcdefghijklmnopabcdefghijklmnop');

      // Then
      expect(detection.webStoreUrl()).toBe(
        'https://chromewebstore.google.com/detail/abcdefghijklmnopabcdefghijklmnop',
      );
    });
  });
});
