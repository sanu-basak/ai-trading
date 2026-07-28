/** Marker interface for commands (state-changing intents). */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ICommand {}

/** Handles exactly one command type and optionally returns a result. */
export interface ICommandHandler<TCommand extends ICommand, TResult = void> {
  execute(command: TCommand): Promise<TResult>;
}

/** Constructor type used as the registration key for a command. */
export type CommandClass<TCommand extends ICommand = ICommand> = new (...args: never[]) => TCommand;
