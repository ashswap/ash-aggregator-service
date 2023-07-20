export type TransactionListQuery = {
  from?: number;
  size?: number;
  sender?: string;
  receiver?: string[];
  token?: string;
  senderShard?: number;
  receiverShard?: number;
  miniBlockHash?: number;
  hashes?: string[];
  status?: 'success' | 'pending' | 'invalid' | 'fail';
  search?: string;
  function?: string;
  before?: number;
  after?: number;
  order?: 'asc' | 'dsc';
  withScResults?: boolean;
  withOperations?: boolean;
  withLogs?: boolean;
  withScamInfo?: boolean;
  withUsername?: boolean;
};