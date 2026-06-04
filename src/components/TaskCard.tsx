import { useDraggable } from '@dnd-kit/core'
import { useNavigate } from 'react-router-dom'
import type { Task } from '../lib/types'
import { TaskCardView } from './TaskCardView'

/** Draggable task card. Long-press to pick up (so quick swipes still scroll). */
export function TaskCard({ task, onStatusTap }: { task: Task; onStatusTap: (t: Task) => void }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.number}`,
    data: { task },
  })

  return (
    <TaskCardView
      ref={setNodeRef}
      task={task}
      onStatusTap={onStatusTap}
      onOpen={() => navigate(`/t/${task.number}`)}
      dragging={isDragging}
      {...attributes}
      {...listeners}
    />
  )
}
