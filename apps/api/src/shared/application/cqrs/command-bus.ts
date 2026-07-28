import type { Logger } from '../../infrastructure/logger';
import { InternalError } from '../../errors';
import type { CommandClass, ICommand, ICommandHandler } from './command';

/**
 * In-process command bus. Handlers are registered by command class at
 * composition time and resolved by the runtime constructor name at dispatch.
 */
export class CommandBus {
  private readonly handlers = new Map<string, ICommandHandler<ICommand, unknown>>();

  constructor(private readonly logger: Logger) {}

  register<TCommand extends ICommand, TResult>(
    command: CommandClass<TCommand>,
    handler: ICommandHandler<TCommand, TResult>,
  ): void {
    const name = command.name;
    if (this.handlers.has(name)) {
      throw new InternalError(`A handler is already registered for command "${name}"`);
    }
    this.handlers.set(name, handler as ICommandHandler<ICommand, unknown>);
  }

  async execute<TResult = void>(command: ICommand): Promise<TResult> {
    const name = command.constructor.name;
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new InternalError(`No handler registered for command "${name}"`);
    }
    this.logger.debug({ command: name }, 'Dispatching command');
    return handler.execute(command) as Promise<TResult>;
  }

  has(command: CommandClass): boolean {
    return this.handlers.has(command.name);
  }
}
