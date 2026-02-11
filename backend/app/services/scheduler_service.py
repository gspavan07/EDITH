from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.date import DateTrigger
from datetime import datetime
import logging
import asyncio

# Setup Logging
logger = logging.getLogger(__name__)

# Job Store Configuration (In-memory)
jobstores = {
    'default': MemoryJobStore()
}

class SchedulerService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SchedulerService, cls).__new__(cls)
            cls._instance.scheduler = BackgroundScheduler(jobstores=jobstores)
            cls._instance.scheduler.start()
        return cls._instance

    def add_job(self, task_description: str, trigger_type: str, trigger_value: str):
        """
        Adds a job to the scheduler.
        """
        try:
            trigger = None
            if trigger_type == 'interval':
                try:
                    seconds = int(trigger_value)
                    trigger = IntervalTrigger(seconds=seconds)
                except ValueError:
                    logger.error(f"Invalid interval value: {trigger_value}")
                    return None
            elif trigger_type == 'date':
                run_date = datetime.fromisoformat(trigger_value)
                trigger = DateTrigger(run_date=run_date)

            if trigger:
                job = self.scheduler.add_job(
                    execute_scheduled_task,
                    trigger=trigger,
                    args=[task_description],
                    name=task_description,
                    replace_existing=False
                )
                return job.id
        except Exception as e:
            logger.error(f"Failed to schedule job: {e}")
            return None

    def remove_job(self, job_id: str):
        try:
            self.scheduler.remove_job(job_id)
            return True
        except Exception as e:
            logger.error(f"Failed to remove job: {job_id}: {e}")
            return False

    def list_jobs(self):
        jobs = []
        for job in self.scheduler.get_jobs():
           jobs.append({
               "id": job.id,
               "name": job.name,
               "next_run": job.next_run_time.isoformat() if job.next_run_time else None
           })
        return jobs

# The function that actually runs
def execute_scheduled_task(task_description: str):
    """
    Triggers the agent to perform the task.
    """
    logger.info(f"⏰ EXECUTING SCHEDULED TASK: {task_description}")
    
    try:
        from app.services.llm_service import llm_service
        from app.services.mcp_service import mcp_service
        
        async def run_agent_task():
            # Notifications are logged to console. In a real app, this would use Supabase/Websockets.
            logger.info(f"Task result logged to console: {task_description}")
            
            if "check" in task_description.lower() and "email" in task_description.lower():
                result = mcp_service._read_email(limit=5)
                logger.info(f"Check email result: {result}")

        # Run async logic
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_agent_task())
        loop.close()

    except Exception as e:
        logger.error(f"Scheduler Task Execution Error: {e}")
