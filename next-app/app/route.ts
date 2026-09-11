import { NextRequest } from 'next/server';
import { renderClientView } from '@/lib/view-renderer';

export async function GET(req: NextRequest) {
  return renderClientView('index.html');
}
