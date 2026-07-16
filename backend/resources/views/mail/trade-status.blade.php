<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trade Request Update — Kisher.Shop</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #e2e8f0;
        }
        .container {
            max-width: 520px;
            margin: 40px auto;
            background-color: #1e293b;
            border-radius: 16px;
            padding: 32px;
        }
        h1 {
            color: #f1f5f9;
            font-size: 20px;
            font-weight: 800;
            margin: 0 0 24px;
            text-align: center;
        }
        .greeting {
            color: #94a3b8;
            font-size: 14px;
            margin: 0 0 16px;
        }
        .message-box {
            background-color: #0f172a;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 16px;
            font-size: 15px;
            line-height: 1.6;
        }
        .message-box p {
            margin: 0;
        }
        .message-box p + p {
            margin-top: 12px;
        }
        .request-detail {
            font-size: 13px;
            color: #64748b;
        }
        .accepted { color: #34d399; }
        .declined { color: #fb7185; }
        .whatsapp { color: #a78bfa; }
        .closing {
            font-size: 14px;
            color: #94a3b8;
            margin: 0;
        }
        .footer {
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #334155;
            text-align: center;
        }
        .footer p {
            margin: 0;
            font-size: 12px;
            color: #64748b;
        }
        .footer a {
            color: #818cf8;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>
            @if(in_array($status, ['completed', 'reviewed']))
                🎉 Trade Request Accepted
            @elseif($status === 'declined')
                Trade Request Declined
            @else
                Trade Request Updated
            @endif
        </h1>

        <p class="greeting">Hello,</p>

        @if(in_array($status, ['completed', 'reviewed']))
            <div class="message-box">
                <p>Great news — your trade request has been <strong class="accepted">accepted</strong>!</p>
                <p>Our team will contact you shortly via <span class="whatsapp">WhatsApp</span> to finalize the details and complete your trade.</p>
                <p class="request-detail">Request: <em>{{ $tradeDescription }}</em></p>
            </div>
            <p class="closing">Please keep your phone nearby — we'll be in touch soon!</p>
        @elseif($status === 'declined')
            <div class="message-box">
                <p>Unfortunately, your trade request has been <strong class="declined">declined</strong>.</p>
                <p>This could be because the items offered don't match our inventory needs or didn't meet our trade criteria.</p>
                <p class="request-detail">Request: <em>{{ $tradeDescription }}</em></p>
            </div>
            <p class="closing">Feel free to submit a new trade request with different details, or reach out to support with questions.</p>
        @else
            <div class="message-box">
                <p>Your trade request status has been updated to <strong>{{ $status }}</strong>.</p>
                <p class="request-detail">Request: <em>{{ $tradeDescription }}</em></p>
            </div>
        @endif

        <div class="footer">
            <p>&copy; {{ date('Y') }} <a href="https://kisher.shop">Kisher.Shop</a> — Your Digital Marketplace</p>
        </div>
    </div>
</body>
</html>