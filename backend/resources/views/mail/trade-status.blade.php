<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trade Request Update</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #e2e8f0; }
        .container { max-width: 520px; margin: 40px auto; background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
        .header { padding: 32px 32px 16px; text-align: center; }
        .header h1 { color: #f1f5f9; font-size: 22px; margin: 0; }
        .body { padding: 8px 32px 32px; }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .status-accepted { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.2); }
        .status-declined { background: rgba(244, 63, 94, 0.15); color: #fb7185; border: 1px solid rgba(244, 63, 94, 0.2); }
        .message-box { background: #0f172a; border-radius: 12px; padding: 20px; margin: 20px 0; font-size: 15px; line-height: 1.6; }
        .accent { color: #a78bfa; }
        .footer { padding: 20px 32px; border-top: 1px solid #334155; text-align: center; font-size: 12px; color: #64748b; }
        .footer a { color: #818cf8; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                @if(in_array($status, ['completed', 'reviewed']))
                    🎉 Trade Request Accepted
                @elseif($status === 'declined')
                    Trade Request Declined
                @else
                    Trade Request Updated
                @endif
            </h1>
        </div>

        <div class="body">
            <p style="margin: 0 0 16px; font-size: 14px; color: #94a3b8;">Hello,</p>

            @if(in_array($status, ['completed', 'reviewed']))
                <div class="message-box">
                    <p style="margin: 0;">Great news — your trade request has been <strong style="color: #34d399;">accepted</strong>!</p>
                    <p style="margin: 12px 0 0;">Our team will contact you shortly via <span class="accent">WhatsApp</span> to finalize the details and complete your trade.</p>
                    <p style="margin: 12px 0 0; font-size: 13px; color: #64748b;">Request description: <em>{{ $tradeDescription }}</em></p>
                </div>
                <p style="font-size: 14px; color: #94a3b8;">Please keep your phone nearby — we'll be in touch soon!</p>
            @elseif($status === 'declined')
                <div class="message-box">
                    <p style="margin: 0;">Unfortunately, your trade request has been <strong style="color: #fb7185;">declined</strong>.</p>
                    <p style="margin: 12px 0 0;">This could be because the items or services offered don't match our current inventory needs, or the offer didn't meet our trade criteria.</p>
                    <p style="margin: 12px 0 0; font-size: 13px; color: #64748b;">Request description: <em>{{ $tradeDescription }}</em></p>
                </div>
                <p style="font-size: 14px; color: #94a3b8;">If you have any questions, feel free to reach out to our support team or submit a new trade request with different details.</p>
            @else
                <div class="message-box">
                    <p style="margin: 0;">Your trade request status has been updated to <strong>{{ $status }}</strong>.</p>
                    <p style="margin: 12px 0 0; font-size: 13px; color: #64748b;">Request description: <em>{{ $tradeDescription }}</em></p>
                </div>
            @endif
        </div>

        <div class="footer">
            <p style="margin: 0;">&copy; {{ date('Y') }} <a href="https://kisher.shop">Kisher.Shop</a> — Your Digital Marketplace</p>
        </div>
    </div>
</body>
</html>
