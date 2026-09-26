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
    <div className="inline-flex max-w-full items-center gap-0.5">
      <span className="font-mono text-xs tracking-tight truncate" title={address}>{displayAddress}</span>
      {showCopy && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 sm:h-6 sm:w-6 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            copyToClipboard();
          }}
          aria-label="copy address"
        >
          <Copy className="h-3 w-3" />
        </Button>
      )}
      {showLink && (
        <a
          href={`${BASE_SCAN_URL}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          aria-label="view on basescan"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors sm:h-6 sm:w-6"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
