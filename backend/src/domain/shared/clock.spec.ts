import { systemClock } from './clock';

describe('systemClock', () => {
  it('AC-004-08 sleeps for the given time and tells the current date', async () => {
    jest.useFakeTimers();
    const done = jest.fn();
    const sleeping = systemClock.sleep(1000).then(done);
    jest.advanceTimersByTime(999);
    await Promise.resolve();
    expect(done).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await sleeping;
    expect(done).toHaveBeenCalled();
    jest.useRealTimers();
    expect(systemClock.now()).toBeInstanceOf(Date);
  });
});
