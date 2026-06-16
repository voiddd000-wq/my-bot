const fs = require('node:fs');
const path = require('node:path');
const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  PermissionsBitField,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const OPEN_BUTTON_ID = 'ticket_open';
const CLOSE_BUTTON_ID = 'ticket_close';
const CONFIRM_BUTTON_ID = 'ticket_close_confirm';
const TICKET_STORE = path.join(__dirname, '..', 'data', 'tickets.json');
const TICKET_REQUEST_CHANNEL_ID = '1516232281587712161';
const TICKET_CATEGORY_ID = '1516240768216596635';

function loadTickets() {
  try {
    if (!fs.existsSync(TICKET_STORE)) {
      return { tickets: [] };
    }
    const raw = fs.readFileSync(TICKET_STORE, 'utf8');
    return JSON.parse(raw || '{"tickets": []}');
  } catch (error) {
    console.error('Failed to load tickets:', error);
    return { tickets: [] };
  }
}

function saveTickets(data) {
  try {
    fs.writeFileSync(TICKET_STORE, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save tickets:', error);
  }
}

function getNextTicketNumber(tickets, guild = null) {
  let max = 0;
  for (const ticket of tickets.tickets) {
    let name = ticket.channelName || '';
    if (!name && guild && ticket.channelId) {
      const ch = guild.channels.cache.get(ticket.channelId);
      if (ch) name = ch.name;
    }
    const match = /cat-(\d+)/.exec(name);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return max + 1;
}

function getNextTicketName(tickets, guild) {
  return `cat-${getNextTicketNumber(tickets, guild)}`;
}

function getStaffRoles(guild) {
  const modRole = getRoleByName(guild, 'Moderator');
  const adminRole = getRoleByName(guild, 'Admin');
  return [modRole, adminRole].filter(Boolean);
}

function getRoleByName(guild, name) {
  return guild.roles.cache.find(role => role.name.toLowerCase() === name.toLowerCase());
}

async function getTicketCategory(guild) {
  let category = guild.channels.cache.get(TICKET_CATEGORY_ID);
  if (!category) {
    category = await guild.channels.fetch(TICKET_CATEGORY_ID).catch(() => null);
  }

  if (category?.type === ChannelType.GuildCategory) return category;

  return guild.channels.create({
    name: 'Tickets',
    type: ChannelType.GuildCategory,
  });
}

async function getOrCreateLogChannel(interaction, staffRoleIds) {
  const existing = interaction.guild.channels.cache.find(channel =>
    channel.type === ChannelType.GuildText && channel.name.toLowerCase() === 'ticket-logs'
  );
  if (existing) return existing;

  const everyone = interaction.guild.roles.everyone;
  const overwrites = [
    {
      id: everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    ...staffRoleIds.map(id => ({
      id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    })),
  ];

  return interaction.guild.channels.create({
    name: 'ticket-logs',
    type: ChannelType.GuildText,
    permissionOverwrites: overwrites,
  });
}

async function createTicketChannel(interaction, tickets, staffRoles, reason) {
  const category = await getTicketCategory(interaction.guild);
  const ticketName = getNextTicketName(tickets, interaction.guild);
  const everyone = interaction.guild.roles.everyone;
  const permissionOverwrites = [
    {
      id: everyone.id,
      deny: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
    ...staffRoles.map(role => ({
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    })),
  ];

  const ticketChannel = await interaction.guild.channels.create({
    name: ticketName,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites,
  });

  const ticket = {
    userId: interaction.user.id,
    channelId: ticketChannel.id,
    channelName: ticketChannel.name,
    status: 'open',
    reason,
    openedAt: new Date().toISOString(),
    createdBy: interaction.user.tag,
  };
  tickets.tickets.push(ticket);
  saveTickets(tickets);

  const staffMentions = staffRoles.map(role => `<@&${role.id}>`).join(' ') || '@Moderator @Admin';
  const ticketEmbed = new EmbedBuilder()
    .setColor(0x3BA55D)
    .setTitle('🎫 New Ticket Opened')
    .setDescription(`Thank you for opening a ticket. ${staffMentions} will be with you shortly.`)
    .addFields(
      { name: 'Requester', value: interaction.user.tag, inline: true },
      { name: 'Reason', value: reason, inline: true },
      { name: 'Ticket Channel', value: `<#${ticketChannel.id}>`, inline: true },
    )
    .setTimestamp();

  const closeButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CLOSE_BUTTON_ID)
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
  );

  const logChannel = await getOrCreateLogChannel(interaction, staffRoles.map(role => role.id));
  const logEmbed = new EmbedBuilder()
    .setColor(0xFAA61A)
    .setTitle('Ticket log • opened')
    .setDescription(`A new ticket was opened by ${interaction.user.tag}.`)
    .addFields(
      { name: 'Ticket Channel', value: `<#${ticketChannel.id}>`, inline: false },
      { name: 'Requester', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
      { name: 'Reason', value: reason, inline: true },
    )
    .setTimestamp();

  await ticketChannel.send({ content: staffMentions, embeds: [ticketEmbed], components: [closeButton] });
  await logChannel.send({ embeds: [logEmbed] });

  return ticketChannel;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Open or close a support ticket')
    .addStringOption(option =>
      option
        .setName('action')
        .setDescription('Whether to open or close the ticket')
        .setRequired(true)
        .addChoices(
          { name: 'setup', value: 'setup' },
          { name: 'open', value: 'open' },
          { name: 'close', value: 'close' },
        )
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for opening a ticket')
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    if (!interaction.guild) {
      return interaction.editReply('This command can only be used inside a server.');
    }

    const action = interaction.options.getString('action');
    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    const tickets = loadTickets();
    const modRole = getRoleByName(interaction.guild, 'Moderator');
    const adminRole = getRoleByName(interaction.guild, 'Admin');
    const staffRoles = [modRole, adminRole].filter(Boolean);
    const staffMentions = staffRoles.map(role => `<@&${role.id}>`).join(' ') || '@Moderator @Admin';

    if (action === 'setup') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.editReply('You need Manage Channels permission to set up the ticket button.');
      }
      if (interaction.channel.id !== TICKET_REQUEST_CHANNEL_ID) {
        return interaction.editReply(`Ticket open buttons must be created in <#${TICKET_REQUEST_CHANNEL_ID}>.`);
      }

      const openButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(OPEN_BUTTON_ID)
          .setLabel('Open Ticket')
          .setStyle(ButtonStyle.Primary)
      );

      const setupEmbed = new EmbedBuilder()
        .setColor(0x3BA55D)
        .setTitle('Open a ticket')
        .setDescription('Click the button below to open a new support ticket.')
        .setTimestamp();

      await interaction.channel.send({ embeds: [setupEmbed], components: [openButton] });
      return interaction.editReply('Ticket request button has been posted in the ticket request channel.');
    }

    if (action === 'open') {
      if (interaction.channel.id !== TICKET_REQUEST_CHANNEL_ID) {
        return interaction.editReply(`Please use <#${TICKET_REQUEST_CHANNEL_ID}> to open a ticket.`);
      }

      const existingTicket = tickets.tickets.find(
        ticket => ticket.userId === interaction.user.id && ticket.status === 'open'
      );
      if (existingTicket) {
        return interaction.editReply(
          `You already have an open ticket: <#${existingTicket.channelId}>. Please close that ticket before opening a new one.`
        );
      }

      const ticketChannel = await createTicketChannel(interaction, tickets, staffRoles, reason);
      return interaction.editReply(`Your ticket has been opened: <#${ticketChannel.id}>`);
    }

    if (action === 'close') {
      const ticket = tickets.tickets.find(
        t => t.channelId === interaction.channel.id && t.status === 'open'
      );
      if (!ticket) {
        return interaction.editReply('This channel is not registered as an open ticket. You can only close tickets from the ticket channel.');
      }

      const member = interaction.member;
      const isOwner = ticket.userId === interaction.user.id;
      const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels) || staffRoles.some(role => member.roles.cache.has(role.id));
      if (!isOwner && !isStaff) {
        return interaction.editReply('Only the ticket owner or staff members can close this ticket.');
      }

      ticket.status = 'closed';
      ticket.closedAt = new Date().toISOString();
      ticket.closedBy = interaction.user.tag;
      saveTickets(tickets);

      await interaction.channel.permissionOverwrites.edit(ticket.userId, {
        ViewChannel: false,
        SendMessages: false,
        ReadMessageHistory: false,
      });

      await interaction.channel.setName(`closed-${interaction.channel.name}`);

      const closedEmbed = new EmbedBuilder()
        .setColor(0xF04747)
        .setTitle('📌 Ticket Closed')
        .setDescription(`This ticket has been closed by ${interaction.user.tag}.`)
        .addFields(
          { name: 'Closed by', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason, inline: true },
        )
        .setTimestamp();

      const logChannel = await getOrCreateLogChannel(interaction, staffRoles.map(role => role.id));
      const logEmbed = new EmbedBuilder()
        .setColor(0xF04747)
        .setTitle('Ticket log • closed')
        .setDescription(`The ticket in <#${interaction.channel.id}> was closed.`)
        .addFields(
          { name: 'Closed by', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
          { name: 'Ticket Channel', value: `<#${interaction.channel.id}>`, inline: true },
          { name: 'Original reason', value: ticket.reason ?? 'No reason provided', inline: false },
        )
        .setTimestamp();

      await interaction.channel.send({ embeds: [closedEmbed] });
      await logChannel.send({ embeds: [logEmbed] });
      return interaction.editReply('Ticket closed successfully. The channel has been locked and renamed.');
    }

    return interaction.editReply('Unknown ticket action. Use `open` or `close`.');
  },

  buildCloseTicketRow(disabled = false) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(CLOSE_BUTTON_ID)
        .setLabel(disabled ? 'Ticket Closed' : 'Close Ticket')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    );
  },

  buildConfirmCloseRow(disabled = false) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(CONFIRM_BUTTON_ID)
        .setLabel('Confirm Close')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    );
  },

  async closeTicketChannel(interaction, ticket, tickets, staffRoles, reason = 'No reason provided') {
    ticket.status = 'closed';
    ticket.closedAt = new Date().toISOString();
    ticket.closedBy = interaction.user.tag;
    ticket.closeReason = reason;
    saveTickets(tickets);

    await interaction.channel.permissionOverwrites.edit(ticket.userId, {
      ViewChannel: false,
      SendMessages: false,
      ReadMessageHistory: false,
    });

    await interaction.channel.setName(`closed-${interaction.channel.name}`);

    const closedEmbed = new EmbedBuilder()
      .setColor(0xF04747)
      .setTitle('📌 Ticket Closed')
      .setDescription(`This ticket has been closed by ${interaction.user.tag}.`)
      .addFields(
        { name: 'Closed by', value: interaction.user.tag, inline: true },
        { name: 'Reason', value: reason, inline: true },
      )
      .setTimestamp();

    const logChannel = await getOrCreateLogChannel(interaction, staffRoles.map(role => role.id));
    const logEmbed = new EmbedBuilder()
      .setColor(0xF04747)
      .setTitle('Ticket log • closed')
      .setDescription(`The ticket in <#${interaction.channel.id}> was closed.`)
      .addFields(
        { name: 'Closed by', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: true },
        { name: 'Ticket Channel', value: `<#${interaction.channel.id}>`, inline: true },
        { name: 'Original reason', value: ticket.reason ?? 'No reason provided', inline: false },
      )
      .setTimestamp();

    await interaction.channel.send({ embeds: [closedEmbed] });
    await logChannel.send({ embeds: [logEmbed] });
  },

  async handleButtonInteraction(interaction) {
    if (!interaction.channel) {
      return interaction.reply({ content: 'This button can only be used inside a ticket channel.', ephemeral: true });
    }

    const tickets = loadTickets();
    const staffRoles = getStaffRoles(interaction.guild);

    if (interaction.customId === OPEN_BUTTON_ID) {
      if (interaction.channel.id !== TICKET_REQUEST_CHANNEL_ID) {
        return interaction.reply({ content: 'This button can only open tickets from the ticket request channel.', ephemeral: true });
      }

      const existingTicket = tickets.tickets.find(
        ticket => ticket.userId === interaction.user.id && ticket.status === 'open'
      );
      if (existingTicket) {
        return interaction.reply({ content: `You already have an open ticket: <#${existingTicket.channelId}>.`, ephemeral: true });
      }

      const ticketChannel = await createTicketChannel(interaction, tickets, staffRoles, 'Opened via button');
      return interaction.reply({ content: `Your ticket has been opened: <#${ticketChannel.id}>`, ephemeral: true });
    }

    const ticket = tickets.tickets.find(t => t.channelId === interaction.channel.id && t.status === 'open');
    if (!ticket) {
      return interaction.reply({ content: 'This channel is not an open ticket.', ephemeral: true });
    }

    const isOwner = ticket.userId === interaction.user.id;
    const member = interaction.member;
    const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels) || staffRoles.some(role => member.roles.cache.has(role.id));
    if (!isOwner && !isStaff) {
      return interaction.reply({ content: 'Only the ticket owner or staff can close this ticket.', ephemeral: true });
    }

    if (interaction.customId === CLOSE_BUTTON_ID) {
      return interaction.reply({
        content: 'Please confirm closing this ticket.',
        components: [this.buildConfirmCloseRow()],
        ephemeral: true,
      });
    }

    if (interaction.customId === CONFIRM_BUTTON_ID) {
      await this.closeTicketChannel(interaction, ticket, tickets, staffRoles, 'Closed via confirmation button');
      await interaction.update({ content: 'Ticket closed successfully.', components: [] });
      await interaction.message.edit({ components: [this.buildCloseTicketRow(true)] }).catch(() => null);
    }
  },
};
