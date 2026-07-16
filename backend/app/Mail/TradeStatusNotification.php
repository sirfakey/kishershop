<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TradeStatusNotification extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public function __construct(
        public string $status,
        public string $tradeDescription,
    ) {}

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = match ($this->status) {
            'completed', 'reviewed' => 'Your Trade Request Has Been Accepted — Kisher.Shop',
            'declined'              => 'Update on Your Trade Request — Kisher.Shop',
            default                 => 'Trade Request Status Update — Kisher.Shop',
        };

        return new Envelope(subject: $subject);
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'mail.trade-status',
            text: 'mail.trade-status-text',
            with: [
                'status'           => $this->status,
                'tradeDescription' => $this->tradeDescription,
            ],
        );
    }
}
