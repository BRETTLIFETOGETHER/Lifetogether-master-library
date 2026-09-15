// Local browser tests only; never included in a production build.
export const getUser=async()=>({id:'qa-owner',name:'QA Owner',email:'qa@example.test'});
export const login=getUser,signup=getUser,acceptInvite=getUser;
export const logout=async()=>{},handleAuthCallback=async()=>null,requestPasswordRecovery=async()=>{},updateUser=async()=>{};
