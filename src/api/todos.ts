import { client } from '../utils/fetchClient';
import { Todo } from '../types/Todo';

export const USER_ID = 2599;

export const getTodos = () => {
  return client.get<Todo[]>(`/todos?userId=${USER_ID}`);
};
