Trade Request Update — Kisher.Shop
===============================

Hello,

@if(in_array($status, ['completed', 'reviewed']))
Great news — your trade request has been ACCEPTED!

Our team will contact you shortly via WhatsApp to finalize the details
and complete your trade.

Request description: {{ $tradeDescription }}

Please keep your phone nearby — we'll be in touch soon!

@elseif($status === 'declined')
Unfortunately, your trade request has been DECLINED.

This could be because the items or services offered don't match our
current inventory needs, or the offer didn't meet our trade criteria.

Request description: {{ $tradeDescription }}

If you have any questions, feel free to reach out to our support team
or submit a new trade request with different details.

@else
Your trade request status has been updated to "{{ $status }}".

Request description: {{ $tradeDescription }}
@endif

© {{ date('Y') }} Kisher.Shop — Your Digital Marketplace
https://kisher.shop