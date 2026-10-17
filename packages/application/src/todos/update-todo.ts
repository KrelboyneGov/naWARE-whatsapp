import type { ITodoRepository } from "@emergency-map/domain/repositories";
import type { UpdateTodo, TodoBase } from "@emergency-map/domain/schemas";

export async function updateTodo(
  repository: ITodoRepository,
  id: string,
  userId: string,
  data: UpdateTodo,
): Promise<TodoBase | null> {
  return repository.update(id, userId, data);
}
