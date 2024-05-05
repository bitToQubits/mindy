import {
  ActionIcon,
  Avatar,
  createStyles,
  getStylesRef,
  MantineTheme,
  MediaQuery,
  px,
  Image
} from "@mantine/core";

import { IconEdit, IconRepeat, IconSettings, IconX } from "@tabler/icons-react";
import MessageDisplay from "./MessageDisplay";

import { Message } from "../logic_frontend/Message";
import {
  delMessage,
  regenerateAssistantMessage,
  setEditingMessage,
} from "../logic_frontend/ChatActions";
import UserIcon from "./UserIcon";
import AssistantIcon from "./AssistantIcon";

const useStyles = createStyles((theme: MantineTheme) => ({
  containerImage:{
    maxWidth: "ca0lc(100vw - 55px)",
    [`@media (min-width: ${theme.breakpoints.md})`]: {
      maxWidth: "calc(820px - 120px)",
    },
  },
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",

    [`@media (min-width: ${theme.breakpoints.sm})`]: {
      paddingBottom: "5em",
    },
  },
  chatContainer: {
    overflowY: "scroll",
    flexGrow: 1,
    display: "flex",
    flexDirection: "column",
  },
  messageContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 0,
    paddingRight: 0,
    [`@media (min-width: ${theme.breakpoints.md})`]: {
      paddingLeft: theme.spacing.xl,
      paddingRight: theme.spacing.xl,
    },

    [`&:hover .${getStylesRef("button")}`]: {
      opacity: 1,
    },
  },
  userMessageContainer: {
    backgroundColor: "transparent",
  },
  botMessageContainer: {
    backgroundColor: "transparent",
  },
  message: {
    borderRadius: theme.radius.sm,
    paddingLeft: theme.spacing.xs,
    paddingRight: theme.spacing.xs,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
    display: "inline-block",
    maxWidth: "800px",
    wordWrap: "break-word",
    fontSize: theme.fontSizes.sm,
    width: "100%",
  },
  userMessage: {
    // All children that are textarea should have color white
    "& textarea": {
      fontSize: "inherit",
      marginInlineStart: "0px",
      marginInlineEnd: "0px",
    },
  },
  botMessage: {},
  actionIcon: {
    ref: getStylesRef("button"),

    opacity: 0,
    transition: "opacity 0.2s ease-in-out",
  },
  textArea: {
    width: "100%",
  },
  messageDisplay: {
    marginLeft: theme.spacing.md,
  },
  actionIconsWrapper: {
    display: "flex",
    flexDirection: "column-reverse",
    alignItems: "flex-end",

    [`@media (min-width: ${theme.breakpoints.sm})`]: {
      marginTop: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
    },
    "> button": {
      marginTop: theme.spacing.xs,
      [`@media (min-width: ${theme.breakpoints.sm})`]: {
        marginTop: 0,
      },
    },
    "> button:not(:first-of-type)": {
      marginTop: 0,
      [`@media (min-width: ${theme.breakpoints.sm})`]: {
        marginTop: 0,
      },
    },
  },
  messageWrapper: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
  },
  topOfMessage: {
    alignSelf: "start",
    marginTop: theme.spacing.sm,
  },
}));

export default function ChatDisplay({ message }: { message: Message }) {
  const { classes, cx } = useStyles();

  const handleMainAction = (message: Message) => {
    if (message.role === "assistant") {
      regenerateAssistantMessage(message);
    } else {
      setEditingMessage(message);
    }
  };

  const handleDeleteMessage = (message: Message) => {
    delMessage(message);
  };

  return (
    <div
      key={message.id}
      className={cx(
        classes.messageContainer,
        message.role === "user"
          ? classes.userMessageContainer
          : classes.botMessageContainer
      )}
    >
      <div
        className={cx(
          classes.message,
          message.role === "user" ? classes.userMessage : classes.botMessage
        )}
      >
        <div className={classes.messageWrapper}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
            }}
          >
            <MediaQuery smallerThan="md" styles={{ display: "none" }}>
              <div className={classes.topOfMessage}>
                <Avatar size="sm">
                  {message.role === "system" ? (
                    <IconSettings />
                  ) : message.role === "assistant" ? (
                    <AssistantIcon width={px("1.2rem")} height={px("1.2rem")} />
                  ) : (
                      <UserIcon width={px("1.5rem")} height={px("1.5rem")} />
                  )}
                </Avatar>
              </div>
            </MediaQuery>

            {
            message.type != "image" && <MessageDisplay
                message={message}
                className={classes.messageDisplay}
              />
            }

            {
            message.type == "image" && 
              <div className={cx(classes.containerImage, classes.messageDisplay)}>
                <p><b>{message.role === "assistant" ? "Mindy" : "You"}</b></p>
                <Image src={message.content} alt={message.id} />
              </div>
            }

          </div>
          <div className={classes.actionIconsWrapper}>
            <ActionIcon
              className={cx(classes.actionIcon, classes.topOfMessage)}
              onClick={() => handleMainAction(message)}
              color="gray"
            >
              {message.role === "assistant" ? <IconRepeat /> : <IconEdit />}
            </ActionIcon>
            <ActionIcon
              className={cx(classes.actionIcon, classes.topOfMessage)}
              onClick={() => handleDeleteMessage(message)}
              color="gray"
            >
              <IconX />
            </ActionIcon>
          </div>
        </div>
      </div>
    </div>
  );
}
