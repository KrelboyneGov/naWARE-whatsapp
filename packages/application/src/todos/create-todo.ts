import type { ITodoRepository } from "@emergency-map/domain/repositories";
import type { CreateTodo, TodoBase } from "@emergency-map/domain/schemas";

export async function createTodo(
  repository: ITodoRepository,
  data: CreateTodo,
  userId: string,
): Promise<TodoBase> {
  return repository.create({ ...data, userId });
}
