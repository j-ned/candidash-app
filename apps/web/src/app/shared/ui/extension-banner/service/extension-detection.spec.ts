import { TestBed } from '@angular/core/testing';
import { EXTENSION_MARKER_ATTRIBUTE, ExtensionDetection } from './extension-detection';
import { Config } from '@core/services/config';

describe('ExtensionDetection', () => {
  const FIREFOX_UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:144.0) Gecko/20100101 Firefox/144.0';
  const ADDON_URL = 'https://addons.mozilla.org/fr/firefox/addon/candidash/';

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.documentElement.removeAttribute(EXTENSION_MARKER_ATTRIBUTE);
  });

  function setup(extensionId: string | undefined, firefoxAddonUrl?: string): ExtensionDetection {
    TestBed.configureTestingModule({
      providers: [
        ExtensionDetection,
        { provide: Config, useValue: { extensionId, firefoxAddonUrl } },
      ],
    });
    return TestBed.inject(ExtensionDetection);
  }

  function useFirefox(): void {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(FIREFOX_UA);
  }

  it('is installed as soon as the extension marker is on <html>, without pinging', () => {
    // Given
    const sendMessage = vi.fn();
    vi.stubGlobal('chrome', { runtime: { sendMessage } });
    document.documentElement.setAttribute(EXTENSION_MARKER_ATTRIBUTE, '1.0.0');
    const detection = setup('abcdefghijklmnopabcdefghijklmnop');

    // When
    detection.check();

    // Then
    expect(detection.status()).toBe('installed');
    expect(sendMessage).not.toHaveBeenCalled();
  });

  describe('on Firefox', () => {
    it('is installed when the marker is present', () => {
      // Given
      useFirefox();
      document.documentElement.setAttribute(EXTENSION_MARKER_ATTRIBUTE, '1.0.0');
      const detection = setup(undefined, ADDON_URL);

      // When
      detection.check();

      // Then
      expect(detection.status()).toBe('installed');
    });

    it('is not-installed without the marker when the add-on URL is configured', () => {
      // Given
      useFirefox();
      const detection = setup('abcdefghijklmnopabcdefghijklmnop', ADDON_URL);

      // When
      detection.check();

      // Then
      expect(detection.status()).toBe('not-installed');
      expect(detection.installUrl()).toBe(ADDON_URL);
    });

    it('is unavailable without the marker when no add-on URL is configured', () => {
      // Given
      useFirefox();
      const detection = setup('abcdefghijklmnopabcdefghijklmnop');

      // When
      detection.check();

      // Then
      expect(detection.status()).toBe('unavailable');
      expect(detection.installUrl()).toBeNull();
    });
  });

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
    const sendMessage = vi.fn((_id: string, _msg: unknown, cb: (reply: unknown) => void) =>
      cb({ pong: true }),
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

  describe('installUrl outside Firefox', () => {
    it('is null when no extensionId is configured', () => {
      // Given
      const detection = setup(undefined);

      // Then
      expect(detection.installUrl()).toBeNull();
    });

    it('is the Chrome Web Store detail URL when extensionId is configured', () => {
      // Given
      const detection = setup('abcdefghijklmnopabcdefghijklmnop');

      // Then
      expect(detection.installUrl()).toBe(
        'https://chromewebstore.google.com/detail/abcdefghijklmnopabcdefghijklmnop',
      );
    });
  });
});
