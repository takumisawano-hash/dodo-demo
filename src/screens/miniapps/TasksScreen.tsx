import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

// ==================== TYPES ====================
type Priority = 'p1' | 'p2' | 'p3' | 'p4';
type ViewType = 'today' | 'tomorrow' | 'week' | 'all';
type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
}

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  dueTime?: string;
  priority: Priority;
  projectId?: string;
  tags: string[];
  subtasks: SubTask[];
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  recurrence: RecurrenceType;
  recurrenceInterval?: number;
  recurrenceEndDate?: Date;
}

// ==================== CONSTANTS ====================
const COLORS = {
  primary: '#FF6B35',
  background: '#FFF5E6',
  white: '#FFFFFF',
  text: '#333333',
  textSecondary: '#666666',
  textMuted: '#999999',
  border: '#E0E0E0',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FFC107',
  p1: '#D32F2F',
  p2: '#FF9800',
  p3: '#2196F3',
  p4: '#9E9E9E',
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; icon: string }> = {
  p1: { label: '最優先', color: COLORS.p1, icon: '🔴' },
  p2: { label: '高', color: COLORS.p2, icon: '🟠' },
  p3: { label: '中', color: COLORS.p3, icon: '🔵' },
  p4: { label: '低', color: COLORS.p4, icon: '⚪' },
};

const DEFAULT_PROJECTS: Project[] = [
  { id: 'inbox', name: 'インボックス', color: '#607D8B', icon: '📥' },
  { id: 'personal', name: '個人', color: '#4CAF50', icon: '👤' },
  { id: 'work', name: '仕事', color: '#2196F3', icon: '💼' },
  { id: 'shopping', name: '買い物', color: '#9C27B0', icon: '🛒' },
  { id: 'health', name: '健康', color: '#F44336', icon: '❤️' },
];

const DEFAULT_TAGS: Tag[] = [
  { id: 'urgent', name: '緊急', color: '#F44336' },
  { id: 'important', name: '重要', color: '#FF9800' },
  { id: 'quick', name: 'すぐできる', color: '#4CAF50' },
  { id: 'waiting', name: '待ち', color: '#9E9E9E' },
  { id: 'someday', name: 'いつか', color: '#607D8B' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceType; label: string }[] = [
  { value: 'none', label: '繰り返しなし' },
  { value: 'daily', label: '毎日' },
  { value: 'weekly', label: '毎週' },
  { value: 'monthly', label: '毎月' },
  { value: 'yearly', label: '毎年' },
];

// ==================== UTILITY FUNCTIONS ====================
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: Date): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (isSameDay(date, today)) return '今日';
  if (isSameDay(date, tomorrow)) return '明日';
  
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayOfWeek = dayNames[date.getDay()];
  
  return `${month}/${day}(${dayOfWeek})`;
};

const isSameDay = (d1: Date, d2: Date): boolean => {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const isOverdue = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
};

const isToday = (date: Date): boolean => isSameDay(date, new Date());

const isTomorrow = (date: Date): boolean => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
};

const isThisWeek = (date: Date): boolean => {
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);
  
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);
  
  return date >= startOfToday && date <= endOfWeek;
};

const getNextRecurrenceDate = (task: Task): Date | undefined => {
  if (!task.dueDate || task.recurrence === 'none') return undefined;
  
  const nextDate = new Date(task.dueDate);
  switch (task.recurrence) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + (task.recurrenceInterval || 1));
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7 * (task.recurrenceInterval || 1));
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + (task.recurrenceInterval || 1));
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + (task.recurrenceInterval || 1));
      break;
  }
  
  if (task.recurrenceEndDate && nextDate > task.recurrenceEndDate) {
    return undefined;
  }
  
  return nextDate;
};

// ==================== SAMPLE DATA ====================
const createSampleTasks = (): Task[] => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 5);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  return [
    {
      id: generateId(),
      title: '牛乳を買う',
      priority: 'p2',
      projectId: 'shopping',
      tags: ['quick'],
      subtasks: [],
      completed: false,
      createdAt: new Date(),
      dueDate: today,
      recurrence: 'none',
    },
    {
      id: generateId(),
      title: '週次レポート作成',
      description: 'プロジェクトの進捗をまとめる',
      priority: 'p1',
      projectId: 'work',
      tags: ['important'],
      subtasks: [
        { id: generateId(), title: 'データ収集', completed: true },
        { id: generateId(), title: 'グラフ作成', completed: false },
        { id: generateId(), title: 'レビュー依頼', completed: false },
      ],
      completed: false,
      createdAt: new Date(),
      dueDate: today,
      recurrence: 'weekly',
    },
    {
      id: generateId(),
      title: 'ジョギング30分',
      priority: 'p3',
      projectId: 'health',
      tags: [],
      subtasks: [],
      completed: false,
      createdAt: new Date(),
      dueDate: tomorrow,
      recurrence: 'daily',
    },
    {
      id: generateId(),
      title: '読書: Clean Code',
      description: '第3章まで読む',
      priority: 'p4',
      projectId: 'personal',
      tags: ['someday'],
      subtasks: [],
      completed: false,
      createdAt: new Date(),
      dueDate: nextWeek,
      recurrence: 'none',
    },
    {
      id: generateId(),
      title: '期限切れタスク（テスト）',
      priority: 'p1',
      projectId: 'inbox',
      tags: ['urgent'],
      subtasks: [],
      completed: false,
      createdAt: yesterday,
      dueDate: yesterday,
      recurrence: 'none',
    },
  ];
};

// ==================== COMPONENTS ====================

// ViewTab Component
interface ViewTabProps {
  views: { key: ViewType; label: string; count: number }[];
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const ViewTabs: React.FC<ViewTabProps> = ({ views, activeView, onViewChange }) => (
  <View style={styles.tabContainer}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {views.map((view) => (
        <TouchableOpacity
          key={view.key}
          style={[styles.tab, activeView === view.key && styles.tabActive]}
          onPress={() => onViewChange(view.key)}
        >
          <Text style={[styles.tabText, activeView === view.key && styles.tabTextActive]}>
            {view.label}
          </Text>
          {view.count > 0 && (
            <View style={[styles.tabBadge, activeView === view.key && styles.tabBadgeActive]}>
              <Text style={[styles.tabBadgeText, activeView === view.key && styles.tabBadgeTextActive]}>
                {view.count}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// TaskItem Component
interface TaskItemProps {
  task: Task;
  projects: Project[];
  tags: Tag[];
  onToggleComplete: (taskId: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onPress: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({
  task,
  projects,
  tags,
  onToggleComplete,
  onToggleSubtask,
  onPress,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const project = projects.find(p => p.id === task.projectId);
  const taskTags = tags.filter(t => task.tags.includes(t.id));
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const overdue = task.dueDate && !task.completed && isOverdue(task.dueDate);
  
  return (
    <View style={[styles.taskItem, task.completed && styles.taskItemCompleted]}>
      <View style={styles.taskMain}>
        {/* Checkbox */}
        <TouchableOpacity
          style={[
            styles.checkbox,
            { borderColor: PRIORITY_CONFIG[task.priority].color },
            task.completed && styles.checkboxCompleted,
          ]}
          onPress={() => onToggleComplete(task.id)}
        >
          {task.completed && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
        
        {/* Task Content */}
        <TouchableOpacity style={styles.taskContent} onPress={() => onPress(task)}>
          <View style={styles.taskTitleRow}>
            <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
              {task.title}
            </Text>
            {task.recurrence !== 'none' && (
              <Text style={styles.recurrenceIcon}>🔄</Text>
            )}
          </View>
          
          {task.description && (
            <Text style={styles.taskDescription} numberOfLines={1}>
              {task.description}
            </Text>
          )}
          
          {/* Task Meta */}
          <View style={styles.taskMeta}>
            {/* Due Date */}
            {task.dueDate && (
              <View style={[styles.metaTag, overdue && styles.metaTagOverdue]}>
                <Text style={[styles.metaTagText, overdue && styles.metaTagTextOverdue]}>
                  📅 {formatDate(task.dueDate)}
                </Text>
              </View>
            )}
            
            {/* Project */}
            {project && (
              <View style={[styles.metaTag, { backgroundColor: project.color + '20' }]}>
                <Text style={[styles.metaTagText, { color: project.color }]}>
                  {project.icon} {project.name}
                </Text>
              </View>
            )}
            
            {/* Tags */}
            {taskTags.map(tag => (
              <View key={tag.id} style={[styles.metaTag, { backgroundColor: tag.color + '20' }]}>
                <Text style={[styles.metaTagText, { color: tag.color }]}>
                  #{tag.name}
                </Text>
              </View>
            ))}
            
            {/* Subtasks count */}
            {task.subtasks.length > 0 && (
              <TouchableOpacity
                style={styles.subtaskBadge}
                onPress={() => setExpanded(!expanded)}
              >
                <Text style={styles.subtaskBadgeText}>
                  ☑️ {completedSubtasks}/{task.subtasks.length}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Priority Indicator */}
        <View style={[styles.priorityIndicator, { backgroundColor: PRIORITY_CONFIG[task.priority].color }]} />
        
        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(task.id)}
        >
          <Text style={styles.deleteButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      
      {/* Subtasks */}
      {expanded && task.subtasks.length > 0 && (
        <View style={styles.subtaskList}>
          {task.subtasks.map(subtask => (
            <TouchableOpacity
              key={subtask.id}
              style={styles.subtaskItem}
              onPress={() => onToggleSubtask(task.id, subtask.id)}
            >
              <View style={[styles.subtaskCheckbox, subtask.completed && styles.subtaskCheckboxCompleted]}>
                {subtask.completed && <Text style={styles.subtaskCheckmark}>✓</Text>}
              </View>
              <Text style={[styles.subtaskTitle, subtask.completed && styles.subtaskTitleCompleted]}>
                {subtask.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// Task Editor Modal
interface TaskEditorProps {
  visible: boolean;
  task?: Task;
  projects: Project[];
  tags: Tag[];
  onSave: (task: Partial<Task>) => void;
  onClose: () => void;
}

const TaskEditor: React.FC<TaskEditorProps> = ({
  visible,
  task,
  projects,
  tags,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [priority, setPriority] = useState<Priority>(task?.priority || 'p4');
  const [projectId, setProjectId] = useState(task?.projectId || 'inbox');
  const [selectedTags, setSelectedTags] = useState<string[]>(task?.tags || []);
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task?.recurrence || 'none');
  const [subtasks, setSubtasks] = useState<SubTask[]>(task?.subtasks || []);
  const [newSubtask, setNewSubtask] = useState('');
  const [dueDate, setDueDate] = useState<'none' | 'today' | 'tomorrow' | 'nextweek'>(
    task?.dueDate ? (isToday(task.dueDate) ? 'today' : isTomorrow(task.dueDate) ? 'tomorrow' : 'nextweek') : 'none'
  );
  
  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'タスク名を入力してください');
      return;
    }
    
    let dueDateValue: Date | undefined;
    const now = new Date();
    switch (dueDate) {
      case 'today':
        dueDateValue = now;
        break;
      case 'tomorrow':
        dueDateValue = new Date(now);
        dueDateValue.setDate(now.getDate() + 1);
        break;
      case 'nextweek':
        dueDateValue = new Date(now);
        dueDateValue.setDate(now.getDate() + 7);
        break;
    }
    
    onSave({
      id: task?.id,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      projectId,
      tags: selectedTags,
      recurrence,
      subtasks,
      dueDate: dueDateValue,
    });
    
    // Reset form
    setTitle('');
    setDescription('');
    setPriority('p4');
    setProjectId('inbox');
    setSelectedTags([]);
    setRecurrence('none');
    setSubtasks([]);
    setDueDate('none');
    onClose();
  };
  
  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, { id: generateId(), title: newSubtask.trim(), completed: false }]);
      setNewSubtask('');
    }
  };
  
  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(s => s.id !== id));
  };
  
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]
    );
  };
  
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCancel}>キャンセル</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{task ? 'タスク編集' : '新規タスク'}</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.modalSave}>保存</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {/* Title */}
            <TextInput
              style={styles.titleInput}
              placeholder="タスク名"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
            
            {/* Description */}
            <TextInput
              style={styles.descriptionInput}
              placeholder="説明（任意）"
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            
            {/* Due Date */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📅 期限</Text>
              <View style={styles.optionRow}>
                {[
                  { value: 'none', label: 'なし' },
                  { value: 'today', label: '今日' },
                  { value: 'tomorrow', label: '明日' },
                  { value: 'nextweek', label: '来週' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionButton, dueDate === option.value && styles.optionButtonActive]}
                    onPress={() => setDueDate(option.value as any)}
                  >
                    <Text style={[styles.optionButtonText, dueDate === option.value && styles.optionButtonTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Priority */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚩 優先度</Text>
              <View style={styles.optionRow}>
                {(Object.keys(PRIORITY_CONFIG) as Priority[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      { borderColor: PRIORITY_CONFIG[p].color },
                      priority === p && { backgroundColor: PRIORITY_CONFIG[p].color },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      { color: priority === p ? COLORS.white : PRIORITY_CONFIG[p].color },
                    ]}>
                      {PRIORITY_CONFIG[p].icon} {PRIORITY_CONFIG[p].label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Project */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📁 プロジェクト</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionRow}>
                  {projects.map((project) => (
                    <TouchableOpacity
                      key={project.id}
                      style={[
                        styles.projectButton,
                        { borderColor: project.color },
                        projectId === project.id && { backgroundColor: project.color },
                      ]}
                      onPress={() => setProjectId(project.id)}
                    >
                      <Text style={[
                        styles.projectButtonText,
                        { color: projectId === project.id ? COLORS.white : project.color },
                      ]}>
                        {project.icon} {project.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            
            {/* Tags */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🏷️ タグ</Text>
              <View style={styles.tagRow}>
                {tags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagButton,
                      { borderColor: tag.color },
                      selectedTags.includes(tag.id) && { backgroundColor: tag.color },
                    ]}
                    onPress={() => toggleTag(tag.id)}
                  >
                    <Text style={[
                      styles.tagButtonText,
                      { color: selectedTags.includes(tag.id) ? COLORS.white : tag.color },
                    ]}>
                      #{tag.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Recurrence */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔄 繰り返し</Text>
              <View style={styles.optionRow}>
                {RECURRENCE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.optionButton, recurrence === option.value && styles.optionButtonActive]}
                    onPress={() => setRecurrence(option.value)}
                  >
                    <Text style={[styles.optionButtonText, recurrence === option.value && styles.optionButtonTextActive]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {/* Subtasks */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>☑️ サブタスク</Text>
              {subtasks.map((subtask) => (
                <View key={subtask.id} style={styles.subtaskEditItem}>
                  <Text style={styles.subtaskEditTitle}>• {subtask.title}</Text>
                  <TouchableOpacity onPress={() => removeSubtask(subtask.id)}>
                    <Text style={styles.subtaskRemove}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.subtaskInputRow}>
                <TextInput
                  style={styles.subtaskInput}
                  placeholder="サブタスクを追加"
                  placeholderTextColor={COLORS.textMuted}
                  value={newSubtask}
                  onChangeText={setNewSubtask}
                  onSubmitEditing={addSubtask}
                />
                <TouchableOpacity style={styles.subtaskAddButton} onPress={addSubtask}>
                  <Text style={styles.subtaskAddButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ==================== MAIN COMPONENT ====================
export default function TasksScreen() {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState<Task[]>(createSampleTasks);
  const [projects] = useState<Project[]>(DEFAULT_PROJECTS);
  const [tags] = useState<Tag[]>(DEFAULT_TAGS);
  const [activeView, setActiveView] = useState<ViewType>('today');
  const [showEditor, setShowEditor] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [showCompleted, setShowCompleted] = useState(false);
  
  // Filter tasks based on view
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(t => !t.completed);
    
    switch (activeView) {
      case 'today':
        filtered = filtered.filter(t => t.dueDate && (isToday(t.dueDate) || isOverdue(t.dueDate)));
        break;
      case 'tomorrow':
        filtered = filtered.filter(t => t.dueDate && isTomorrow(t.dueDate));
        break;
      case 'week':
        filtered = filtered.filter(t => t.dueDate && isThisWeek(t.dueDate));
        break;
      // 'all' shows everything
    }
    
    // Sort by priority then due date
    filtered.sort((a, b) => {
      const priorityOrder = { p1: 0, p2: 1, p3: 2, p4: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
    
    return filtered;
  }, [tasks, activeView]);
  
  const completedTasks = useMemo(() => {
    return tasks.filter(t => t.completed).sort((a, b) => 
      (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0)
    );
  }, [tasks]);
  
  // View counts
  const viewCounts = useMemo(() => ({
    today: tasks.filter(t => !t.completed && t.dueDate && (isToday(t.dueDate) || isOverdue(t.dueDate))).length,
    tomorrow: tasks.filter(t => !t.completed && t.dueDate && isTomorrow(t.dueDate)).length,
    week: tasks.filter(t => !t.completed && t.dueDate && isThisWeek(t.dueDate)).length,
    all: tasks.filter(t => !t.completed).length,
  }), [tasks]);
  
  // Handlers
  const handleToggleComplete = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      
      if (!task.completed && task.recurrence !== 'none') {
        // For recurring tasks, create next occurrence
        const nextDate = getNextRecurrenceDate(task);
        if (nextDate) {
          const newTask: Task = {
            ...task,
            id: generateId(),
            dueDate: nextDate,
            completed: false,
            completedAt: undefined,
            createdAt: new Date(),
            subtasks: task.subtasks.map(s => ({ ...s, completed: false })),
          };
          setTasks(p => [...p, newTask]);
        }
      }
      
      return {
        ...task,
        completed: !task.completed,
        completedAt: !task.completed ? new Date() : undefined,
      };
    }));
  }, []);
  
  const handleToggleSubtask = useCallback((taskId: string, subtaskId: string) => {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task;
      return {
        ...task,
        subtasks: task.subtasks.map(s =>
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        ),
      };
    }));
  }, []);
  
  const handleSaveTask = useCallback((taskData: Partial<Task>) => {
    if (taskData.id) {
      // Update existing task
      setTasks(prev => prev.map(t =>
        t.id === taskData.id ? { ...t, ...taskData } : t
      ));
    } else {
      // Create new task
      const newTask: Task = {
        id: generateId(),
        title: taskData.title || '',
        description: taskData.description,
        priority: taskData.priority || 'p4',
        projectId: taskData.projectId || 'inbox',
        tags: taskData.tags || [],
        subtasks: taskData.subtasks || [],
        completed: false,
        createdAt: new Date(),
        dueDate: taskData.dueDate,
        recurrence: taskData.recurrence || 'none',
      };
      setTasks(prev => [newTask, ...prev]);
    }
    setEditingTask(undefined);
  }, []);
  
  const handleDeleteTask = useCallback((taskId: string) => {
    Alert.alert(
      'タスクを削除',
      'このタスクを削除しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => setTasks(prev => prev.filter(t => t.id !== taskId)),
        },
      ]
    );
  }, []);
  
  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setShowEditor(true);
  }, []);
  
  const overdueCount = tasks.filter(t => !t.completed && t.dueDate && isOverdue(t.dueDate)).length;
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>✅ タスク</Text>
          {overdueCount > 0 && (
            <View style={styles.overdueAlert}>
              <Text style={styles.overdueAlertText}>⚠️ {overdueCount}件期限切れ</Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          style={styles.completedToggle}
          onPress={() => setShowCompleted(!showCompleted)}
        >
          <Text style={styles.completedToggleText}>
            {showCompleted ? '📋' : '✓'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* View Tabs */}
      <ViewTabs
        views={[
          { key: 'today', label: '今日', count: viewCounts.today },
          { key: 'tomorrow', label: '明日', count: viewCounts.tomorrow },
          { key: 'week', label: '今週', count: viewCounts.week },
          { key: 'all', label: '全て', count: viewCounts.all },
        ]}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      
      {/* Task List */}
      <ScrollView style={styles.taskList} contentContainerStyle={styles.taskListContent}>
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🎉</Text>
            <Text style={styles.emptyStateText}>タスクがありません</Text>
            <Text style={styles.emptyStateSubtext}>新しいタスクを追加しましょう</Text>
          </View>
        ) : (
          filteredTasks.map(task => (
            <TaskItem
              key={task.id}
              task={task}
              projects={projects}
              tags={tags}
              onToggleComplete={handleToggleComplete}
              onToggleSubtask={handleToggleSubtask}
              onPress={handleEditTask}
              onDelete={handleDeleteTask}
            />
          ))
        )}
        
        {/* Completed Tasks Section */}
        {showCompleted && completedTasks.length > 0 && (
          <View style={styles.completedSection}>
            <Text style={styles.completedSectionTitle}>
              ✅ 完了したタスク ({completedTasks.length})
            </Text>
            {completedTasks.slice(0, 10).map(task => (
              <TaskItem
                key={task.id}
                task={task}
                projects={projects}
                tags={tags}
                onToggleComplete={handleToggleComplete}
                onToggleSubtask={handleToggleSubtask}
                onPress={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))}
          </View>
        )}
      </ScrollView>
      
      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingTask(undefined);
          setShowEditor(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
      
      {/* Task Editor Modal */}
      <TaskEditor
        visible={showEditor}
        task={editingTask}
        projects={projects}
        tags={tags}
        onSave={handleSaveTask}
        onClose={() => {
          setShowEditor(false);
          setEditingTask(undefined);
        }}
      />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.white,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  overdueAlert: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  overdueAlertText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  completedToggle: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedToggleText: {
    fontSize: 20,
    color: COLORS.white,
  },
  
  // Tabs
  tabContainer: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  tabBadge: {
    backgroundColor: COLORS.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  tabBadgeActive: {
    backgroundColor: COLORS.primary,
  },
  tabBadgeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tabBadgeTextActive: {
    color: COLORS.white,
  },
  
  // Task List
  taskList: {
    flex: 1,
  },
  taskListContent: {
    padding: 12,
    paddingBottom: 100,
  },
  
  // Task Item
  taskItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskItemCompleted: {
    opacity: 0.7,
  },
  taskMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTitle: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
    flex: 1,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  recurrenceIcon: {
    fontSize: 12,
    marginLeft: 4,
  },
  taskDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  metaTag: {
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  metaTagOverdue: {
    backgroundColor: COLORS.danger + '20',
  },
  metaTagText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  metaTagTextOverdue: {
    color: COLORS.danger,
    fontWeight: 'bold',
  },
  subtaskBadge: {
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  subtaskBadgeText: {
    fontSize: 12,
    color: COLORS.success,
  },
  priorityIndicator: {
    width: 4,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  deleteButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteButtonText: {
    fontSize: 20,
    color: COLORS.textMuted,
  },
  
  // Subtasks
  subtaskList: {
    paddingLeft: 48,
    paddingRight: 12,
    paddingBottom: 12,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  subtaskCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  subtaskCheckboxCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  subtaskCheckmark: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  subtaskTitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  subtaskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: COLORS.textMuted,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  
  // Completed Section
  completedSection: {
    marginTop: 24,
  },
  completedSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 12,
    paddingLeft: 4,
  },
  
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: '300',
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalSave: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  modalBody: {
    padding: 16,
  },
  
  // Form Inputs
  titleInput: {
    fontSize: 18,
    color: COLORS.text,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 12,
    marginBottom: 12,
  },
  descriptionInput: {
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  
  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  optionButtonText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  optionButtonTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  
  // Priority Buttons
  priorityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    marginRight: 8,
    marginBottom: 8,
  },
  priorityButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Project Buttons
  projectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    marginRight: 8,
  },
  projectButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Tag Buttons
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  tagButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  
  // Subtask Editor
  subtaskEditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subtaskEditTitle: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  subtaskRemove: {
    fontSize: 20,
    color: COLORS.danger,
    paddingHorizontal: 8,
  },
  subtaskInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  subtaskInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  subtaskAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  subtaskAddButtonText: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: '300',
  },
});
