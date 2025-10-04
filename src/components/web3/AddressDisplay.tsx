import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { formatAddress } from '@/lib/web3/utils';
import { BASE_SCAN_URL } from '@/lib/web3/constants';

interface AddressDisplayProps {
  address: string;
  showCopy?: boolean;
  showLink?: boolean;
  format?: boolean;
}

export function AddressDisplay({ 
  address, 
  showCopy = true, 
  showLink = true,
  format = true 
}: AddressDisplayProps) {
  const displayAddress = format ? formatAddress(address) : address;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    toast({ description: 'copied' });
  };

  return (
    <div className="inline-flex items-center gap-1">
      <span className="font-mono text-xs tracking-tight">{displayAddress}</span>
      {showCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4"
          onClick={copyToClipboard}
        >
          <Copy className="h-3 w-3" />
        </Button>
      )}
      {showLink && (
        <a
          href={`${BASE_SCAN_URL}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="ghost" size="icon" className="h-4 w-4">
            <ExternalLink className="h-3 w-3" />
          </Button>
        </a>
      )}
    </div>
  );
}
