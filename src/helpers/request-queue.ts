import EventEmitter from 'events';

export interface QueueTask<T = any> {
  id: string;
  type: string;
  data: T;
  priority: number;
  retryCount: number;
  maxRetries: number;
  nextRetryTime?: number;
  lastError?: Error;
}

export default class RequestQueue extends EventEmitter {
  private queue: QueueTask[] = [];
  private inProgress = new Map<string, QueueTask>();
  private isProcessing = false;
  private concurrentLimit: number;
  private rateLimitMs: number;
  private lastRequestTime = 0;
  
  constructor(concurrentLimit = 1, rateLimitMs = 2000) {
    super();
    this.concurrentLimit = concurrentLimit;
    this.rateLimitMs = rateLimitMs;
  }
  
  public enqueue<T>(type: string, data: T, options: { 
    priority?: number, 
    maxRetries?: number,
    id?: string 
  } = {}): string {
    const taskId = options.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const task: QueueTask = {
      id: taskId,
      type,
      data,
      priority: options.priority || 0,
      retryCount: 0,
      maxRetries: options.maxRetries || 3
    };
    
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
    
    return taskId;
  }
  
  public cancelTask(taskId: string): boolean {
    const index = this.queue.findIndex(task => task.id === taskId);
    if (index >= 0) {
      this.queue.splice(index, 1);
      return true;
    }
    return false;
  }
  
  public pauseQueue(): void {
    this.isProcessing = false;
  }
  
  public resumeQueue(): void {
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.processQueue();
    }
  }
  
  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.isProcessing && (this.queue.length > 0 || this.inProgress.size > 0)) {
      // Check if we can process more tasks
      if (this.inProgress.size < this.concurrentLimit && this.queue.length > 0) {
        // Rate limiting check
        const now = Date.now();
        if (now - this.lastRequestTime < this.rateLimitMs) {
          await new Promise(resolve => setTimeout(resolve, this.rateLimitMs - (now - this.lastRequestTime)));
        }
        
        // Get next task
        const task = this.queue.shift();
        
        // Set last request time
        this.lastRequestTime = Date.now();
        
        // Mark as in progress
        this.inProgress.set(task.id, task);
        
        // Emit event for processing
        this.emit('task', task, this.handleTaskCompletion.bind(this, task.id));
      } else {
        // Wait for in-progress tasks to complete or rate limit to expire
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  public handleTaskCompletion(taskId: string, error?: Error, result?: any): void {
    const task = this.inProgress.get(taskId);
    if (!task) return;
    
    this.inProgress.delete(taskId);
    
    if (error) {
      // Handle retries
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.lastError = error;
        
        // Exponential backoff
        const backoffMs = Math.min(
          30000, // max 30 seconds
          1000 * Math.pow(1.5, task.retryCount) + Math.floor(Math.random() * 1000)
        );
        
        task.nextRetryTime = Date.now() + backoffMs;
        
        console.log(`Task ${taskId} failed, retrying in ${backoffMs}ms (attempt ${task.retryCount}/${task.maxRetries})`);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.queue.push(task);
          this.queue.sort((a, b) => b.priority - a.priority);
        }, backoffMs);
      } else {
        // Max retries exceeded
        this.emit('taskFailed', task, error);
      }
    } else {
      // Task completed successfully
      this.emit('taskCompleted', task, result);
    }
  }
  
  public get queueLength(): number {
    return this.queue.length;
  }
  
  public get activeTasksCount(): number {
    return this.inProgress.size;
  }
} 