export function dispatchResultNotice(result) {
  if (['failed','needs_replan'].includes(result.routing_status)) return {
    type:'error', message:result.warning || 'Routes could not be published. Review crew capacity, task estimates and route settings before retrying.'};
  if (result.routing_status==='routing') return {type:'info',message:'Routes are being computed. Check back shortly.'};
  if (result.routing_status==='empty' || !result.tasks?.length) return {
    type:'warning',message:result.warning || 'No tasks were dispatched. Review the plan’s eligible tasks and crew configuration.'};
  return null;
}
