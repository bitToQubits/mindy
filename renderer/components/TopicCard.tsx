import { Card, Image, Text, Group, Badge } from '@mantine/core';
import classes from '../css/topicCard.module.css';
import { Classifier } from "../logic_frontend/Classifier";

export default function TopicCard({ classifier }: { classifier: Classifier }) {

  return (
    <Card withBorder radius="md" p="md">
      <Card.Section>
        <Image src={classifier.image} alt={classifier.title} height={180} />
      </Card.Section>

      <Card.Section className={classes.section} mt="md">
        <Group>
          <Text fz="lg" fw={500}>
            {classifier.title}
          </Text>
          <Badge size="sm" color="red" variant="light">
            {classifier.num_chats} chats
          </Badge>
        </Group>
      </Card.Section>
    </Card>
  );
}