import { Card, Image, Text, Group, Badge } from '@mantine/core';
import classes from '../css/topicCard.module.css';
import { Chat } from "../logic_frontend/Chat";
import {useRouter} from 'next/router';

export default function ChatCard({ chat }: { chat: Chat }) {

    const router = useRouter();

    return (
        <Card
            shadow="sm"
            padding="xl"
            onClick={(event) => {
                event.preventDefault();
                router.push(`/chat/${chat.id}`);
                }}
            style={{cursor: "pointer"}}
        >

            <Text fw={500} size="lg" mt="md">
                {chat.title || "Untitled"}
            </Text>

            <Text mt="xs" c="dimmed" size="sm">
                Created at {new Date(chat.createdAt).toLocaleString()}
            </Text>
        </Card>
    )
}