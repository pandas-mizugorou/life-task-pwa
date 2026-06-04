import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useNavigate } from 'react-router-dom'
import type { Task } from '../lib/types'
import { TaskCardView } from './TaskCardView'

/** Sortable task card. Long-press to pick up: drag within a column to reorder,
 *  or onto another column to change status. Quick swipes still scroll. */
export function TaskCard({
  task,
  onStatusTap,
  onLabelTap,
}: {
  task: Task
  onStatusTap: (t: Task) => void
  onLabelTap: (t: Task) => void
}) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.number}`,
    data: { task },
  })

  return (
    <TaskCardView
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      task={task}
      onStatusTap={onStatusTap}
      onLabelTap={onLabelTap}
      onOpen={() => navigate(`/t/${task.number}`)}
      dragging={isDragging}
      {...attributes}
      {...listeners}
    />
  )
}
