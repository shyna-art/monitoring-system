from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv
import os

from pydantic import BaseModel

class DepotCreate(BaseModel):
    name: str


load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SECRET_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://monitoring-system-blush.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Monitoring System API is running"}

@app.get("/api/ping")
def ping():
    return {"message": "pong from FastAPI"}

@app.get("/api/test-db")
def test_db():
    try:
        result = supabase.table("test").select("*").limit(1).execute()
        return {"connected": True, "data": result.data}
    except Exception as e:
        return {"connected": False, "error": str(e)}

class TruckerCreate(BaseModel):
    name: str
    depot_id: str

class DepotReasonCreate(BaseModel):
    reason: str
    is_active: bool = True

@app.post("/api/depots")
def create_depot(depot: DepotCreate):
    result = supabase.table("depots").insert({"name": depot.name}).execute()
    return result.data

@app.get("/api/depots")
def list_depots():
    result = supabase.table("depots").select("*").eq("is_active", True).order("name").execute()
    return result.data

@app.put("/api/depots/{depot_id}")
def update_depot(depot_id: str, depot: DepotCreate):
    result = supabase.table("depots").update({"name": depot.name}).eq("id", depot_id).execute()
    return result.data

@app.put("/api/depots/{depot_id}/archive")
def archive_depot(depot_id: str):
    result = supabase.table("depots").update({"is_active": False}).eq("id", depot_id).execute()
    return result.data

@app.post("/api/truckers")
def create_trucker(trucker: TruckerCreate):
    result = supabase.table("truckers").insert({
        "name": trucker.name,
        "depot_id": trucker.depot_id
    }).execute()
    return result.data

@app.get("/api/truckers")
def list_truckers():
    result = supabase.table("truckers").select("*, depots(name)").eq("is_active", True).order("name").execute()
    return result.data

class DriverCreate(BaseModel):
    name: str
    trucker_id: str

@app.put("/api/truckers/{trucker_id}")
def update_trucker(trucker_id: str, trucker: TruckerCreate):
    result = supabase.table("truckers").update({
        "name": trucker.name,
        "depot_id": trucker.depot_id
    }).eq("id", trucker_id).execute()
    return result.data

@app.put("/api/truckers/{trucker_id}/archive")
def archive_trucker(trucker_id: str):
    result = supabase.table("truckers").update({"is_active": False}).eq("id", trucker_id).execute()
    return result.data

@app.post("/api/drivers")
def create_driver(driver: DriverCreate):
    result = supabase.table("drivers").insert({
        "name": driver.name,
        "trucker_id": driver.trucker_id
    }).execute()
    return result.data

@app.get("/api/drivers")
def list_drivers():
    result = supabase.table("drivers").select("*, truckers(name, depot_id, depots(name))").eq("is_active", True).order("name").execute()
    return result.data

@app.put("/api/drivers/{driver_id}")
def update_driver(driver_id: str, driver: DriverCreate):
    result = supabase.table("drivers").update({
        "name": driver.name,
        "trucker_id": driver.trucker_id
    }).eq("id", driver_id).execute()
    return result.data

@app.put("/api/drivers/{driver_id}/archive")
def archive_driver(driver_id: str):
    result = supabase.table("drivers").update({"is_active": False}).eq("id", driver_id).execute()
    return result.data

class ReasonCreate(BaseModel):
    reason: str
    is_active: bool = True

@app.post("/api/driver-reasons")
def create_driver_reason(reason: ReasonCreate):
    result = supabase.table("driver_non_usage_reasons").insert({
        "reason": reason.reason,
        "is_active": reason.is_active
    }).execute()
    return result.data

@app.get("/api/driver-reasons")
def list_driver_reasons():
    result = supabase.table("driver_non_usage_reasons").select("*").order("reason").execute()
    return result.data

@app.put("/api/driver-reasons/{reason_id}")
def update_driver_reason(reason_id: str, reason: ReasonCreate):
    result = supabase.table("driver_non_usage_reasons").update({
        "reason": reason.reason,
        "is_active": reason.is_active
    }).eq("id", reason_id).execute()
    return result.data

from typing import Optional
from datetime import date

class DriverMonitoringCreate(BaseModel):
    driver_id: str
    monitoring_date: date
    status: str  # "Using" | "Not Using" | "Not Monitored"
    reason_id: Optional[str] = None
    remarks: Optional[str] = None

class DepotMonitoringCreate(BaseModel):
    depot_id: str
    monitoring_date: date
    status: str  # "Using" | "Not Using" | "Partial" | "Not Monitored"
    reason_id: Optional[str] = None
    remarks: Optional[str] = None

from datetime import time as time_type

class BreakdownCreate(BaseModel):
    system_name: str
    breakdown_date: date
    start_time: str  # "HH:MM" format
    end_time: str    # "HH:MM" format
    affected_area: Optional[str] = None
    reason: Optional[str] = None
    status: str  # e.g. "Resolved", "Ongoing"
    remarks: Optional[str] = None

class SBRequestCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str  # "Low" | "Medium" | "High" | "Critical"
    date_requested: date
    assigned_team: Optional[str] = None
    status: str  # "Pending" | "In Progress" | "For Testing" | "For Deployment" | "Resolved" | "Cancelled"
    date_started: Optional[date] = None
    date_resolved: Optional[date] = None
    remarks: Optional[str] = None

@app.post("/api/driver-monitoring")
def create_driver_monitoring(record: DriverMonitoringCreate):
    if record.status not in ["Using", "Not Using", "Not Monitored"]:
        return {"error": "Invalid status"}
    if record.status == "Not Using" and not record.reason_id:
        return {"error": "Reason is required when status is 'Not Using'"}

    result = supabase.table("driver_monitoring").insert({
        "driver_id": record.driver_id,
        "monitoring_date": record.monitoring_date.isoformat(),
        "status": record.status,
        "reason_id": record.reason_id,
        "remarks": record.remarks
    }).execute()
    return result.data

@app.get("/api/driver-monitoring")
def list_driver_monitoring():
    result = supabase.table("driver_monitoring").select(
        "*, drivers(name, truckers(name, depots(name))), driver_non_usage_reasons(reason)"
    ).order("monitoring_date", desc=True).execute()
    return result.data

@app.put("/api/driver-monitoring/{record_id}")
def update_driver_monitoring(record_id: str, record: DriverMonitoringCreate):
    if record.status not in ["Using", "Not Using", "Not Monitored"]:
        return {"error": "Invalid status"}
    if record.status == "Not Using" and not record.reason_id:
        return {"error": "Reason is required when status is 'Not Using'"}

    result = supabase.table("driver_monitoring").update({
        "driver_id": record.driver_id,
        "monitoring_date": record.monitoring_date.isoformat(),
        "status": record.status,
        "reason_id": record.reason_id,
        "remarks": record.remarks
    }).eq("id", record_id).execute()
    return result.data

@app.delete("/api/driver-monitoring/{record_id}")
def delete_driver_monitoring(record_id: str):
    result = supabase.table("driver_monitoring").delete().eq("id", record_id).execute()
    return {"deleted": True}

@app.get("/api/analytics/driver-tracking")
def driver_tracking_analytics(start_date: str = None, end_date: str = None):
    drivers_result = supabase.table("drivers").select(
        "id, name, trucker_id, truckers(id, name, depot_id, depots(id, name))"
    ).eq("is_active", True).execute()
    all_drivers = drivers_result.data

    query = supabase.table("driver_monitoring").select("driver_id, monitoring_date, status")
    if start_date:
        query = query.gte("monitoring_date", start_date)
    if end_date:
        query = query.lte("monitoring_date", end_date)
    monitoring_result = query.order("monitoring_date", desc=True).execute()
    all_records = monitoring_result.data

    # Find each driver's latest status
    latest_status = {}
    for record in all_records:
        driver_id = record["driver_id"]
        if driver_id not in latest_status:
            latest_status[driver_id] = record["status"]

    # Overall totals
    total_drivers = len(all_drivers)
    using_count = 0
    not_using_count = 0
    not_monitored_count = 0

    # Per-trucker breakdown
    trucker_stats = {}

    for driver in all_drivers:
        status = latest_status.get(driver["id"], "Not Monitored")

        if status == "Using":
            using_count += 1
        elif status == "Not Using":
            not_using_count += 1
        else:
            not_monitored_count += 1

        trucker = driver.get("truckers")
        if trucker:
            tid = trucker["id"]
            if tid not in trucker_stats:
                trucker_stats[tid] = {
                    "trucker_id": tid,
                    "trucker_name": trucker["name"],
                    "depot_name": trucker["depots"]["name"] if trucker.get("depots") else None,
                    "total_drivers": 0,
                    "using": 0,
                    "not_using": 0,
                    "not_monitored": 0,
                }
            trucker_stats[tid]["total_drivers"] += 1
            if status == "Using":
                trucker_stats[tid]["using"] += 1
            elif status == "Not Using":
                trucker_stats[tid]["not_using"] += 1
            else:
                trucker_stats[tid]["not_monitored"] += 1

    # Calculate rates per trucker
    trucker_list = []
    for stats in trucker_stats.values():
        total = stats["total_drivers"]
        stats["usage_rate"] = round((stats["using"] / total) * 100, 1) if total > 0 else 0
        stats["non_usage_rate"] = round((stats["not_using"] / total) * 100, 1) if total > 0 else 0
        trucker_list.append(stats)

    # Rankings
    top_by_not_using_count = sorted(trucker_list, key=lambda x: x["not_using"], reverse=True)
    top_by_non_usage_rate = sorted(trucker_list, key=lambda x: x["non_usage_rate"], reverse=True)

    return {
        "overall": {
            "total_drivers": total_drivers,
            "using": using_count,
            "not_using": not_using_count,
            "not_monitored": not_monitored_count,
            "usage_rate": round((using_count / total_drivers) * 100, 1) if total_drivers > 0 else 0,
            "non_usage_rate": round((not_using_count / total_drivers) * 100, 1) if total_drivers > 0 else 0,
        },
        "by_trucker": trucker_list,
        "top_truckers_by_not_using_count": top_by_not_using_count[:5],
        "top_truckers_by_non_usage_rate": top_by_non_usage_rate[:5],
    }
@app.post("/api/depot-reasons")
def create_depot_reason(reason: DepotReasonCreate):
    result = supabase.table("depot_monitoring_reasons").insert({
        "reason": reason.reason,
        "is_active": reason.is_active
    }).execute()
    return result.data

@app.get("/api/depot-reasons")
def list_depot_reasons():
    result = supabase.table("depot_monitoring_reasons").select("*").order("reason").execute()
    return result.data

@app.put("/api/depot-reasons/{reason_id}")
def update_depot_reason(reason_id: str, reason: DepotReasonCreate):
    result = supabase.table("depot_monitoring_reasons").update({
        "reason": reason.reason,
        "is_active": reason.is_active
    }).eq("id", reason_id).execute()
    return result.data

@app.post("/api/depot-monitoring")
def create_depot_monitoring(record: DepotMonitoringCreate):
    if record.status not in ["Using", "Not Using", "Partial", "Not Monitored"]:
        return {"error": "Invalid status"}
    if record.status in ["Not Using", "Partial"] and not record.reason_id:
        return {"error": "Reason is required when status is 'Not Using' or 'Partial'"}

    result = supabase.table("depot_monitoring").insert({
        "depot_id": record.depot_id,
        "monitoring_date": record.monitoring_date.isoformat(),
        "status": record.status,
        "reason_id": record.reason_id,
        "remarks": record.remarks
    }).execute()
    return result.data

@app.get("/api/depot-monitoring")
def list_depot_monitoring():
    result = supabase.table("depot_monitoring").select(
        "*, depots(name), depot_monitoring_reasons(reason)"
    ).order("monitoring_date", desc=True).execute()
    return result.data

@app.put("/api/depot-monitoring/{record_id}")
def update_depot_monitoring(record_id: str, record: DepotMonitoringCreate):
    if record.status not in ["Using", "Not Using", "Partial", "Not Monitored"]:
        return {"error": "Invalid status"}
    if record.status in ["Not Using", "Partial"] and not record.reason_id:
        return {"error": "Reason is required when status is 'Not Using' or 'Partial'"}

    result = supabase.table("depot_monitoring").update({
        "depot_id": record.depot_id,
        "monitoring_date": record.monitoring_date.isoformat(),
        "status": record.status,
        "reason_id": record.reason_id,
        "remarks": record.remarks
    }).eq("id", record_id).execute()
    return result.data

@app.delete("/api/depot-monitoring/{record_id}")
def delete_depot_monitoring(record_id: str):
    result = supabase.table("depot_monitoring").delete().eq("id", record_id).execute()
    return {"deleted": True}

@app.get("/api/analytics/depot-monitoring")
def depot_monitoring_analytics(start_date: str = None, end_date: str = None):
    depots_result = supabase.table("depots").select("id, name").eq("is_active", True).execute()
    all_depots = depots_result.data

    query = supabase.table("depot_monitoring").select("depot_id, monitoring_date, status")
    if start_date:
        query = query.gte("monitoring_date", start_date)
    if end_date:
        query = query.lte("monitoring_date", end_date)
    monitoring_result = query.order("monitoring_date", desc=True).execute()
    all_records = monitoring_result.data

    latest_status = {}
    for record in all_records:
        depot_id = record["depot_id"]
        if depot_id not in latest_status:
            latest_status[depot_id] = record["status"]

    total_depots = len(all_depots)
    using_count = 0
    not_using_count = 0
    partial_count = 0
    not_monitored_count = 0

    for depot in all_depots:
        status = latest_status.get(depot["id"], "Not Monitored")
        if status == "Using":
            using_count += 1
        elif status == "Not Using":
            not_using_count += 1
        elif status == "Partial":
            partial_count += 1
        else:
            not_monitored_count += 1

    return {
        "total_depots": total_depots,
        "using": using_count,
        "not_using": not_using_count,
        "partial": partial_count,
        "not_monitored": not_monitored_count,
        "usage_percentage": round((using_count / total_depots) * 100, 1) if total_depots > 0 else 0,
    }

@app.post("/api/breakdowns")
def create_breakdown(breakdown: BreakdownCreate):
    result = supabase.table("system_breakdowns").insert({
        "system_name": breakdown.system_name,
        "breakdown_date": breakdown.breakdown_date.isoformat(),
        "start_time": breakdown.start_time,
        "end_time": breakdown.end_time,
        "affected_area": breakdown.affected_area,
        "reason": breakdown.reason,
        "status": breakdown.status,
        "remarks": breakdown.remarks
    }).execute()
    return result.data

@app.get("/api/breakdowns")
def list_breakdowns():
    result = supabase.table("system_breakdowns").select("*").order("breakdown_date", desc=True).execute()
    return result.data

@app.put("/api/breakdowns/{breakdown_id}")
def update_breakdown(breakdown_id: str, breakdown: BreakdownCreate):
    result = supabase.table("system_breakdowns").update({
        "system_name": breakdown.system_name,
        "breakdown_date": breakdown.breakdown_date.isoformat(),
        "start_time": breakdown.start_time,
        "end_time": breakdown.end_time,
        "affected_area": breakdown.affected_area,
        "reason": breakdown.reason,
        "status": breakdown.status,
        "remarks": breakdown.remarks
    }).eq("id", breakdown_id).execute()
    return result.data

from datetime import datetime, timedelta

def parse_time_flexible(time_str: str) -> datetime:
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(time_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Unrecognized time format: {time_str}")

def calculate_duration_minutes(start_time: str, end_time: str) -> int:
    start = parse_time_flexible(start_time)
    end = parse_time_flexible(end_time)
    if end < start:
        end += timedelta(days=1)  # handles breakdowns crossing midnight
    return int((end - start).total_seconds() / 60)

@app.delete("/api/breakdowns/{breakdown_id}")
def delete_breakdown(breakdown_id: str):
    result = supabase.table("system_breakdowns").delete().eq("id", breakdown_id).execute()
    return {"deleted": True}

@app.get("/api/analytics/breakdowns")
def breakdown_analytics(start_date: str = None, end_date: str = None):
    query = supabase.table("system_breakdowns").select("*")
    if start_date:
        query = query.gte("breakdown_date", start_date)
    if end_date:
        query = query.lte("breakdown_date", end_date)
    result = query.execute()
    all_breakdowns = result.data

    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)

    this_week_count = 0
    this_month_count = 0
    this_year_count = 0
    total_downtime_minutes = 0

    for b in all_breakdowns:
        b_date = datetime.strptime(b["breakdown_date"], "%Y-%m-%d").date()
        duration = calculate_duration_minutes(b["start_time"], b["end_time"])
        total_downtime_minutes += duration

        if b_date >= week_start:
            this_week_count += 1
        if b_date >= month_start:
            this_month_count += 1
        if b_date >= year_start:
            this_year_count += 1

    total_count = len(all_breakdowns)
    avg_downtime = round(total_downtime_minutes / total_count, 1) if total_count > 0 else 0

    return {
        "this_week": this_week_count,
        "this_month": this_month_count,
        "this_year": this_year_count,
        "total_breakdowns": total_count,
        "total_downtime_minutes": total_downtime_minutes,
        "average_downtime_minutes": avg_downtime,
    }

@app.post("/api/sb-requests")
def create_sb_request(req: SBRequestCreate):
    result = supabase.table("sb_requests").insert({
        "title": req.title,
        "description": req.description,
        "priority": req.priority,
        "date_requested": req.date_requested.isoformat(),
        "assigned_team": req.assigned_team,
        "status": req.status,
        "date_started": req.date_started.isoformat() if req.date_started else None,
        "date_resolved": req.date_resolved.isoformat() if req.date_resolved else None,
        "remarks": req.remarks
    }).execute()
    return result.data

@app.get("/api/sb-requests")
def list_sb_requests():
    result = supabase.table("sb_requests").select("*").order("date_requested", desc=True).execute()
    return result.data

@app.put("/api/sb-requests/{request_id}")
def update_sb_request(request_id: str, req: SBRequestCreate):
    result = supabase.table("sb_requests").update({
        "title": req.title,
        "description": req.description,
        "priority": req.priority,
        "date_requested": req.date_requested.isoformat(),
        "assigned_team": req.assigned_team,
        "status": req.status,
        "date_started": req.date_started.isoformat() if req.date_started else None,
        "date_resolved": req.date_resolved.isoformat() if req.date_resolved else None,
        "remarks": req.remarks
    }).eq("id", request_id).execute()
    return result.data

@app.delete("/api/sb-requests/{request_id}")
def delete_sb_request(request_id: str):
    result = supabase.table("sb_requests").delete().eq("id", request_id).execute()
    return {"deleted": True}

@app.get("/api/analytics/sb-requests")
def sb_requests_analytics(start_date: str = None, end_date: str = None):
    query = supabase.table("sb_requests").select("*")
    if start_date:
        query = query.gte("date_requested", start_date)
    if end_date:
        query = query.lte("date_requested", end_date)
    result = query.execute()
    all_requests = result.data

    today = datetime.now().date()

    total = len(all_requests)
    status_counts = {
        "Pending": 0,
        "In Progress": 0,
        "For Testing": 0,
        "For Deployment": 0,
        "Resolved": 0,
        "Cancelled": 0,
    }

    pending_with_age = []

    for r in all_requests:
        status = r.get("status", "Pending")
        if status in status_counts:
            status_counts[status] += 1

        # Only unresolved/uncancelled requests count as "pending" for age tracking
        if status not in ["Resolved", "Cancelled"]:
            requested_date = datetime.strptime(r["date_requested"], "%Y-%m-%d").date()
            age_days = (today - requested_date).days
            pending_with_age.append({
                "id": r["id"],
                "title": r["title"],
                "priority": r["priority"],
                "status": status,
                "date_requested": r["date_requested"],
                "age_days": age_days,
            })

    oldest_pending = sorted(pending_with_age, key=lambda x: x["age_days"], reverse=True)

    return {
        "total_requests": total,
        "status_counts": status_counts,
        "oldest_pending_requests": oldest_pending[:10],
    }

@app.get("/api/dashboard")
def dashboard_summary(start_date: str = None, end_date: str = None):
    depots_result = supabase.table("depots").select("id, name").eq("is_active", True).execute()
    truckers_result = supabase.table("truckers").select("id").eq("is_active", True).execute()
    drivers_result = supabase.table("drivers").select("id").eq("is_active", True).execute()

    total_depots = len(depots_result.data)
    total_truckers = len(truckers_result.data)
    total_drivers = len(drivers_result.data)

    driver_analytics = driver_tracking_analytics(start_date, end_date)
    depot_analytics = depot_monitoring_analytics(start_date, end_date)
    breakdown_stats = breakdown_analytics(start_date, end_date)
    sb_stats = sb_requests_analytics(start_date, end_date)

    # Attention Required — build alerts from real data
    attention = []

    # Depots not using SB (based on latest status)
    depot_monitoring_result = supabase.table("depot_monitoring").select(
        "depot_id, monitoring_date, status, depots(name)"
    ).order("monitoring_date", desc=True).execute()
    seen_depots = set()
    for record in depot_monitoring_result.data:
        did = record["depot_id"]
        if did not in seen_depots:
            seen_depots.add(did)
            if record["status"] == "Not Using":
                depot_name = record["depots"]["name"] if record.get("depots") else "Unknown"
                attention.append(f"{depot_name} has not been using SB")

    # Truckers with high non-usage rate (>= 50%)
    for t in driver_analytics["by_trucker"]:
        if t["non_usage_rate"] >= 50 and t["total_drivers"] > 0:
            attention.append(f"{t['trucker_name']} has {t['non_usage_rate']}% driver non-usage")

    # Drivers with repeated non-usage (>= 3 records)
    driver_monitoring_result = supabase.table("driver_monitoring").select(
        "driver_id, status, drivers(name)"
    ).eq("status", "Not Using").execute()
    driver_not_using_counts = {}
    for record in driver_monitoring_result.data:
        did = record["driver_id"]
        name = record["drivers"]["name"] if record.get("drivers") else "Unknown"
        if did not in driver_not_using_counts:
            driver_not_using_counts[did] = {"name": name, "count": 0}
        driver_not_using_counts[did]["count"] += 1
    for info in driver_not_using_counts.values():
        if info["count"] >= 3:
            attention.append(f"Driver {info['name']} has {info['count']} non-usage records")

    # Oldest pending SB requests (over 10 days)
    for r in sb_stats["oldest_pending_requests"]:
        if r["age_days"] > 10:
            attention.append(f"{r['title']} has been pending for {r['age_days']} days")

    # Breakdowns this week
    if breakdown_stats["this_week"] > 0:
        attention.append(f"SB had {breakdown_stats['this_week']} breakdown(s) this week")

    return {
        "totals": {
            "total_depots": total_depots,
            "total_truckers": total_truckers,
            "total_drivers": total_drivers,
            "drivers_not_using": driver_analytics["overall"]["not_using"],
            "depots_not_using": depot_analytics["not_using"],
            "system_breakdowns_this_month": breakdown_stats["this_month"],
            "pending_sb_requests": sb_stats["status_counts"].get("Pending", 0),
        },
        "driver_tracking": driver_analytics,
        "depot_monitoring": depot_analytics,
        "breakdown": breakdown_stats,
        "sb_requests": sb_stats,
        "attention_required": attention,
    }