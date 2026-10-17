import type { ITodoRepository } from "@emergency-map/domain/repositories";
import type { TodoBase } from "@emergency-map/domain/schemas";

export async function getTodo(
  repository: ITodoRepository,
  id: string,
  userId: string,
): Promise<TodoBase | null> {
  return repository.findById(id, userId);
}
