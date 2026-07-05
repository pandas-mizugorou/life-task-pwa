import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useNavigate } from 'react-router-dom'
import type { Task } from '../lib/types'
import { TaskCardView } from './TaskCardView'

/** Draggable + droppable task card. Long-press to pick up; drop between cards
 *  (an insertion line shows where) to reorder, or onto another column to move. */
export function TaskCard({
  task,
  onLabelTap,
}: {
  task: Task
  onLabelTap: (t: Task) => void
}) {
  const navigate = useNavigate()
  const drag = useDraggable({ id: `task-${task.number}`, data: { task } })
  const drop = useDroppable({ id: `drop-${task.number}`, data: { task } })

  const setNodeRef = (el: HTMLElement | null) => {
    drag.setNodeRef(el)
    drop.setNodeRef(el)
  }

  return (
    <TaskCardView
      ref={setNodeRef}
      task={task}
      onLabelTap={onLabelTap}
      onOpen={() => navigate(`/t/${task.number}`)}
      dragging={drag.isDragging}
      {...drag.attributes}
      {...drag.listeners}
    />
  )
}
